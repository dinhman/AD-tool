export interface AgentStatus {
    id: string;
    status: 'Awaiting' | 'In Talk' | 'Break' | 'Filling card' | 'Working issues' | 'Connecting' | string;
    queue: string;
    errorInfo?: string;
    errorTime?: number;
}

export interface AutoScaleConfig {
    thresholdWaiting: number;
    stepUp: number;
    stepDown: number;
    maxLines: number;
    minLines: number;
    cooldownMs: number;
    monitoredAgents?: string;
}

export interface DatabaseConfig {
    server: string;
    port: number;
    user: string;
    password?: string;
    database: string;
}

export interface AppConfig {
    general: AutoScaleConfig;
    database: DatabaseConfig;
    click: {
        inputLineX: number;
        inputLineY: number;
        saveBtnX: number;
        saveBtnY: number;
    };
}

export interface AutoScaleResult {
    action: 'increase' | 'decrease' | 'none';
    camp1Lines: number;
    camp2Lines: number;
    reason: string;
}
