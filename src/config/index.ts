import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
    general: {
        thresholdWaiting: number;
        stepUp: number;
        stepDown: number;
        maxLines: number;
        minLines: number;
        cooldownMs: number;
        monitoredAgents: string;
        monitorOnly: boolean;
        webhookUrl: string;
    };
    database: {
        server: string;
        port: number;
        user: string;
        password?: string;
        database: string;
    };
    click: {
        camp1_inputX: number;
        camp1_inputY: number;
        camp1_saveX: number;
        camp1_saveY: number;
        camp2_inputX: number;
        camp2_inputY: number;
        camp2_saveX: number;
        camp2_saveY: number;
    };
}

const configPath = path.resolve(process.cwd(), 'config.json');

export function getConfig(): AppConfig {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(data) as AppConfig;
        
        // Đảm bảo không bị lỗi nếu config cũ không có phần tử mới
        if (!parsed.database) parsed.database = { server: '', port: 1433, user: '', password: '', database: 'DeltaTellBox' };
        if (!parsed.general.monitoredAgents) parsed.general.monitoredAgents = '';
        if (parsed.general.monitorOnly === undefined) parsed.general.monitorOnly = false;
        if (parsed.general.webhookUrl === undefined) parsed.general.webhookUrl = 'https://n8n.interlogistics.vn/webhook-test/ea182ac0-70dd-483b-aa8e-e8e9db0f26ad';
        
        if (!parsed.click || (parsed.click as any).inputLineX !== undefined) {
            // Migrate old config or set default
            parsed.click = {
                camp1_inputX: 0, camp1_inputY: 0, camp1_saveX: 0, camp1_saveY: 0,
                camp2_inputX: 0, camp2_inputY: 0, camp2_saveX: 0, camp2_saveY: 0
            };
        }
        
        return parsed;
    } catch (error) {
        console.error('Error reading config.json. Using defaults.', error);
        return {
            general: { thresholdWaiting: 2, stepUp: 1, stepDown: 1, maxLines: 50, minLines: 10, cooldownMs: 10000, monitoredAgents: "", monitorOnly: false, webhookUrl: 'https://n8n.interlogistics.vn/webhook-test/ea182ac0-70dd-483b-aa8e-e8e9db0f26ad' },
            database: { server: '127.0.0.1', port: 1433, user: 'sa', password: '', database: 'DeltaTellBox' },
            click: {
                camp1_inputX: 0, camp1_inputY: 0, camp1_saveX: 0, camp1_saveY: 0,
                camp2_inputX: 0, camp2_inputY: 0, camp2_saveX: 0, camp2_saveY: 0
            }
        };
    }
}

export function saveConfig(newConfig: AppConfig): boolean {
    try {
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing config.json', error);
        return false;
    }
}

export const config = getConfig(); // Initial load
