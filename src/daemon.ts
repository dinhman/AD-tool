import { AppConfig, getConfig } from './config';
import { PBXService } from './services/pbxService';
import { calculateScaleAction } from './logic/autoScaleLogic';
import { insertLog } from './db';
import { AgentStatus } from './types';

export class AutoScaleDaemon {
    private pbxService: PBXService;
    private isRunning: boolean = false;
    private timerId?: NodeJS.Timeout;
    private config: AppConfig;
    private reportedErrors = new Set<string>();

    private currentCamp1Lines: number = 0;
    private currentCamp2Lines: number = 0;

    // State for dashboard
    public lastAgents: AgentStatus[] = [];
    public lastStats = { awaiting: 0, inTalk: 0, break: 0, fillingCard: 0, workingIssues: 0, connecting: 0, total: 0, currentLines: 0 };

    constructor() {
        this.config = getConfig();
        this.pbxService = new PBXService(this.config);
        this.currentCamp1Lines = this.config.general.minLines;
        this.currentCamp2Lines = this.config.general.minLines;
    }

    public updateConfig(newConfig: AppConfig) {
        this.config = newConfig;
        this.pbxService.updateConfig(newConfig);
        insertLog('[Daemon] Config updated dynamically.');
        
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }

    public getIsRunning() {
        return this.isRunning;
    }

    public async testClick(lines: number): Promise<boolean> {
        this.config = getConfig(); // Reload config
        this.pbxService.updateConfig(this.config);
        // Test click sẽ bấm cùng 1 giá trị cho cả 2 chiến dịch
        return await this.pbxService.updateLinesConfig(lines, lines);
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        insertLog(`[Daemon] Starting Auto Scale Daemon...`);
        // Reset state on start
        this.currentCamp1Lines = this.config.general.minLines;
        this.currentCamp2Lines = this.config.general.minLines;
        this.runCycle();

        this.timerId = setInterval(() => {
            this.runCycle();
        }, this.config.general.cooldownMs);
    }

    public stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.timerId) {
            clearInterval(this.timerId);
        }
        insertLog(`[Daemon] Stopped Auto Scale Daemon.`);
    }

    private async runCycle() {
        try {
            // insertLog(`\n--- [Daemon] Starting new cycle ---`); // Optional: avoid spamming cycle logs
            const agents = await this.pbxService.getAgentsStatus();
            // currentLines in PBXService is obsolete since we manage state here
            // const currentLines = await this.pbxService.getCurrentLines();
            
            const awaitingCount = agents.filter(a => a.status === 'Awaiting').length;
            const inTalkCount = agents.filter(a => a.status === 'In Talk').length;
            const breakCount = agents.filter(a => a.status === 'Break').length;
            const fillingCardCount = agents.filter(a => a.status === 'Filling card').length;
            const workingIssuesCount = agents.filter(a => a.status === 'Working issues').length;
            const connectingCount = agents.filter(a => a.status === 'Connecting').length;
            
            // Update state for dashboard
            this.lastAgents = agents;
            
            // Xử lý các trạng thái lỗi và bắn Webhook
            this.processErrors(agents);

            this.lastStats = { 
                awaiting: awaitingCount, 
                inTalk: inTalkCount, 
                break: breakCount,
                fillingCard: fillingCardCount,
                workingIssues: workingIssuesCount,
                connecting: connectingCount,
                total: agents.length, 
                currentLines: this.currentCamp1Lines + this.currentCamp2Lines // sum for backward compatibility in UI
            };

            const logicConfig = {
                thresholdWaiting: this.config.general.thresholdWaiting,
                stepUp: this.config.general.stepUp,
                stepDown: this.config.general.stepDown,
                maxLines: this.config.general.maxLines,
                minLines: this.config.general.minLines,
                cooldownMs: this.config.general.cooldownMs
            };

            const result = calculateScaleAction(agents, this.currentCamp1Lines, this.currentCamp2Lines, logicConfig);

            if (result.action !== 'none') {
                insertLog(`[Daemon] Action Triggered: ${result.action.toUpperCase()}. Reason: ${result.reason}`);
                if (this.config.general.monitorOnly) {
                    insertLog(`[Daemon] Bỏ qua Click do đang bật chế độ Monitor-Only. (Line mới nên là: Trái ${result.camp1Lines}, Phải ${result.camp2Lines})`);
                    this.currentCamp1Lines = result.camp1Lines;
                    this.currentCamp2Lines = result.camp2Lines;
                } else {
                    const success = await this.pbxService.updateLinesConfig(result.camp1Lines, result.camp2Lines);
                    if (success) {
                        this.currentCamp1Lines = result.camp1Lines;
                        this.currentCamp2Lines = result.camp2Lines;
                        insertLog(`[Daemon] Updated lines successfully to Trái ${result.camp1Lines}, Phải ${result.camp2Lines}`);
                    } else {
                        insertLog(`[Daemon] Failed to update lines. Check logs.`);
                    }
                }
            }

        } catch (error: any) {
            console.error('[Daemon] Cycle Error:', error.message);
        }
    }

    private async processErrors(agents: AgentStatus[]) {
        const currentErrors = new Set<string>();

        for (const agent of agents) {
            if (agent.errorInfo) {
                // Tách biệt lỗi ra để theo dõi (1 agent có thể bị lỗi Not Parked sau đó lại bị Connecting Timeout)
                const errorKey = `${agent.id}_${agent.errorInfo}`;
                currentErrors.add(errorKey);

                if (!this.reportedErrors.has(errorKey)) {
                    // Chưa report lỗi này, tiến hành cảnh báo!
                    this.reportedErrors.add(errorKey);
                    
                    const logMsg = `🔴 [CẢNH BÁO] Nhân viên ${agent.id} đang bị lỗi: ${agent.errorInfo} ${agent.errorTime ? `(${agent.errorTime}s)` : ''}`;
                    insertLog(logMsg);

                    // Send Webhook
                    const webhookUrl = this.config.general.webhookUrl;
                    if (webhookUrl && webhookUrl.startsWith('http')) {
                        try {
                            // Cần lấy fetch (node-fetch có sẵn hoặc dùng global fetch từ node 18+)
                            const payload = {
                                login: agent.id,
                                error: agent.errorInfo,
                                time: new Date().toISOString(),
                                duration: agent.errorTime
                            };
                            await fetch(webhookUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                            console.log(`[Daemon] Sent webhook for ${agent.id}`);
                        } catch (e) {
                            console.error(`[Daemon] Failed to send webhook for ${agent.id}`, e);
                        }
                    }
                }
            }
        }

        // Dọn dẹp các lỗi đã được xử lý (nhân viên đã hết lỗi)
        for (const key of this.reportedErrors) {
            if (!currentErrors.has(key)) {
                this.reportedErrors.delete(key);
            }
        }
    }
}
