import { AgentStatus } from '../types';
import { AppConfig } from '../config';
import { mouse, keyboard, Point, Key } from '@nut-tree-fork/nut-js';
import * as sql from 'mssql';
import { insertLog } from '../db';

export class PBXService {
    private config: AppConfig;
    private currentLines: number;

    constructor(config: AppConfig) {
        this.config = config;
        this.currentLines = 22; // Start with default or read from screen later
    }

    public updateConfig(newConfig: AppConfig) {
        this.config = newConfig;
    }

    public async getAgentsStatus(): Promise<AgentStatus[]> {
        try {
            const { server, port, user, password, database } = this.config.database;
            
            if (!server || !user || !database) {
                console.log('[PBXService] Database chưa được cấu hình đầy đủ. Bỏ qua lấy dữ liệu.');
                return [];
            }

            const sqlConfig = {
                user: user,
                password: password || '',
                database: database,
                server: server,
                port: port || 1433,
                options: {
                    encrypt: false,
                    trustServerCertificate: true
                }
            };

            const pool = await sql.connect(sqlConfig);

            // Xử lý danh sách login theo dõi
            let monitoredFilter = '';
            if (this.config.general.monitoredAgents) {
                const agents = this.config.general.monitoredAgents.split(',').map(a => `'${a.trim()}'`).join(',');
                if (agents) {
                    monitoredFilter = `AND u.Login IN (${agents})`;
                }
            }

            const query = `
                SELECT 
                    Login, 
                    UserStatusId,
                    StartTime
                FROM v_UserLatestStatus
                WHERE UserStatusId != -3 ${monitoredFilter.replace('u.Login', 'Login')}
            `;

            const result = await pool.request().query(query);
            await pool.close();

            const agentsData: AgentStatus[] = [];
            
            // Map MS SQL UserStatusId to our internal App Status
            // 1: Not parked, 2: Awaiting, 3: In talk, 4: Connecting, 8: Filling card, 23: Break, 25: Working issues, -5: Вызов (Calling -> In Talk)
            
            result.recordset.forEach(record => {
                let mappedStatus = '';
                let errorInfo: string | undefined = undefined;
                let errorTime: number | undefined = undefined;

                switch (record.UserStatusId) {
                    case 1: 
                        mappedStatus = 'Other (1)';
                        errorInfo = 'Not Parked';
                        break;
                    case 2: mappedStatus = 'Awaiting'; break;
                    case 3: 
                    case -5: mappedStatus = 'In Talk'; break; 
                    case 4: 
                        mappedStatus = 'Connecting';
                        if (record.StartTime) {
                            // Calculate seconds elapsed
                            const startTime = new Date(record.StartTime).getTime();
                            const now = new Date().getTime();
                            const elapsedSec = (now - startTime) / 1000;
                            if (elapsedSec > 9) {
                                errorInfo = `Connecting Timeout (>9s)`;
                                errorTime = Math.floor(elapsedSec);
                            }
                        }
                        break;
                    case 8: mappedStatus = 'Filling card'; break;
                    case 23: mappedStatus = 'Break'; break;
                    case 25: mappedStatus = 'Working issues'; break;
                    default: mappedStatus = `Other (${record.UserStatusId})`; break;
                }
                
                agentsData.push({
                    id: record.Login || 'unknown',
                    status: mappedStatus,
                    queue: 'Q1',
                    errorInfo,
                    errorTime
                });
            });

            insertLog(`[PBXService] Đã lấy thành công ${agentsData.length} nhân viên từ MS SQL.`);
            return agentsData;

        } catch (error: any) {
            insertLog(`[PBXService] Lỗi kết nối hoặc truy vấn MS SQL: ${error.message}`);
            return [];
        }
    }

    private lastTypedCamp1: number = -1;
    private lastTypedCamp2: number = -1;

    public async getCurrentLines(): Promise<number> {
        return this.currentLines;
    }

    public async updateLinesConfig(camp1Lines: number, camp2Lines: number): Promise<boolean> {
        try {
            console.log(`[PBXService] Đang điều khiển chuột để đổi số line thành: Trái ${camp1Lines}, Phải ${camp2Lines}`);
            const clickConfig = this.config.click;

            // Hàm phụ để xử lý click 1 campaign
            const updateOneCamp = async (inputX: number, inputY: number, saveX: number, saveY: number, campName: string, lines: number) => {
                if (inputX === 0 || saveX === 0) {
                    console.log(`[PBXService] Tọa độ Click chưa được cấu hình cho ${campName}. Bỏ qua.`);
                    return;
                }
                
                // Move to input box and double click
                await mouse.setPosition(new Point(inputX, inputY));
                await new Promise(r => setTimeout(r, 100));
                await mouse.leftClick();
                await new Promise(r => setTimeout(r, 50));
                await mouse.leftClick();

                // Type the new number
                await keyboard.type(Key.Backspace);
                await keyboard.type(lines.toString());
                await new Promise(r => setTimeout(r, 100));

                // Move to Save button and click
                await mouse.setPosition(new Point(saveX, saveY));
                await new Promise(r => setTimeout(r, 100));
                await mouse.leftClick();
                console.log(`[PBXService] Đã cập nhật xong ${campName} (${lines})`);
            };

            // Thực thi Campaign 1 (Trái) nếu thay đổi
            if (camp1Lines !== this.lastTypedCamp1) {
                await updateOneCamp(
                    clickConfig.camp1_inputX, clickConfig.camp1_inputY, 
                    clickConfig.camp1_saveX, clickConfig.camp1_saveY, 
                    "Campaign 1", camp1Lines
                );
                this.lastTypedCamp1 = camp1Lines;
            }

            // Thực thi Campaign 2 (Phải) nếu thay đổi
            if (camp2Lines !== this.lastTypedCamp2) {
                await updateOneCamp(
                    clickConfig.camp2_inputX, clickConfig.camp2_inputY, 
                    clickConfig.camp2_saveX, clickConfig.camp2_saveY, 
                    "Campaign 2", camp2Lines
                );
                this.lastTypedCamp2 = camp2Lines;
            }

            console.log(`[PBXService] Đã đổi số line thành công cho toàn bộ hệ thống!`);
            this.currentLines = camp1Lines + camp2Lines;
            return true;
        } catch (error) {
            console.error(`[PBXService] Lỗi khi điều khiển chuột:`, error);
            return false;
        }
    }
}
