import { AgentStatus, AutoScaleConfig, AutoScaleResult } from '../types';

export function calculateScaleAction(
    agents: AgentStatus[],
    currentCamp1: number,
    currentCamp2: number,
    config: AutoScaleConfig
): AutoScaleResult {
    try {
        if (!agents || agents.length === 0) {
            return { action: 'none', camp1Lines: currentCamp1, camp2Lines: currentCamp2, reason: 'No agents available' };
        }

        const awaitingCount = agents.filter(a => a.status === 'Awaiting').length;
        // Gom các trạng thái đang làm việc thành Busy (Bận)
        const busyCount = agents.filter(a => 
            a.status === 'In Talk' || 
            a.status === 'Working issues' || 
            a.status === 'Filling card' || 
            a.status === 'Connecting'
        ).length;

        const totalAgents = agents.length;
        const busyRatio = totalAgents > 0 ? (busyCount / totalAgents) : 0;

        // Luật 1: Nếu waiting = 0 -> Rớt thẳng về minLines
        if (awaitingCount === 0) {
            if (currentCamp1 > config.minLines || currentCamp2 > config.minLines) {
                return {
                    action: 'decrease',
                    camp1Lines: config.minLines,
                    camp2Lines: config.minLines,
                    reason: `No awaiting agents (everyone busy). Dropping to minimum (${config.minLines}, ${config.minLines}).`
                };
            } else {
                return { action: 'none', camp1Lines: config.minLines, camp2Lines: config.minLines, reason: `No awaiting agents, already at minimum (${config.minLines}, ${config.minLines}).` };
            }
        }

        // Luật 2: Đủ tải (busy >= 75%) -> Giữ nguyên
        if (busyRatio >= 0.75) {
            return {
                action: 'none',
                camp1Lines: currentCamp1,
                camp2Lines: currentCamp2,
                reason: `Busy ratio is >= 75% (${(busyRatio*100).toFixed(0)}%). Holding lines steady.`
            };
        }

        // Luật 3: Tăng Line (waiting > 0 & busy < 75%)
        if (awaitingCount > 0 && busyRatio < 0.75) {
            // Tăng Trái (Camp1) trước, Phải (Camp2) sau. Mỗi bước tăng theo stepUp. Max = maxLines.
            let nextCamp1 = currentCamp1;
            let nextCamp2 = currentCamp2;

            if (currentCamp1 >= config.maxLines && currentCamp2 >= config.maxLines) {
                return {
                    action: 'none',
                    camp1Lines: config.maxLines,
                    camp2Lines: config.maxLines,
                    reason: `Needs more lines but max limit (${config.maxLines}, ${config.maxLines}) already reached.`
                };
            }

            if (currentCamp1 === currentCamp2) {
                // Tăng Trái trước
                nextCamp1 = Math.min(config.maxLines, currentCamp1 + config.stepUp);
            } else if (currentCamp1 > currentCamp2) {
                // Trái đã tăng, giờ tăng Phải
                nextCamp2 = Math.min(config.maxLines, currentCamp2 + config.stepUp);
            } else {
                // Phải lớn hơn Trái? (Không nên xảy ra nếu logic chạy chuẩn, nhưng đề phòng)
                nextCamp1 = Math.min(config.maxLines, currentCamp1 + config.stepUp);
            }

            return {
                action: 'increase',
                camp1Lines: nextCamp1,
                camp2Lines: nextCamp2,
                reason: `Busy ratio is < 75% (${(busyRatio*100).toFixed(0)}%) and waiting=${awaitingCount}. Increasing to (${nextCamp1}, ${nextCamp2}).`
            };
        }

        return { action: 'none', camp1Lines: currentCamp1, camp2Lines: currentCamp2, reason: 'Stable condition' };

    } catch (error: any) {
        console.error('Error calculating scale action:', error.message);
        return { action: 'none', camp1Lines: currentCamp1, camp2Lines: currentCamp2, reason: 'Error in calculation logic' };
    }
}
