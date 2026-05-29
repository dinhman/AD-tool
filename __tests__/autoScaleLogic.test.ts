import { calculateScaleAction } from '../src/logic/autoScaleLogic';
import { AgentStatus, AutoScaleConfig } from '../src/types';

describe('calculateScaleAction', () => {
    const config: AutoScaleConfig = {
        thresholdWaiting: 2,
        stepUp: 2,
        stepDown: 1,
        maxLines: 30,
        minLines: 10,
        cooldownMs: 5000,
    };

    it('should return none when there are no agents', () => {
        const result = calculateScaleAction([], 20, config);
        expect(result.action).toBe('none');
        expect(result.newLines).toBe(20);
    });

    it('should increase lines when waiting agents reach threshold', () => {
        const agents: AgentStatus[] = [
            { id: '1', status: 'Awaiting', queue: 'q1' },
            { id: '2', status: 'Awaiting', queue: 'q1' },
            { id: '3', status: 'In talk', queue: 'q1' },
        ];
        const result = calculateScaleAction(agents, 20, config);
        expect(result.action).toBe('increase');
        expect(result.newLines).toBe(22);
    });

    it('should not increase lines beyond maxLines', () => {
        const agents: AgentStatus[] = [
            { id: '1', status: 'Awaiting', queue: 'q1' },
            { id: '2', status: 'Awaiting', queue: 'q1' },
        ];
        const result = calculateScaleAction(agents, 29, config);
        expect(result.action).toBe('increase');
        expect(result.newLines).toBe(30);
    });

    it('should return none if already at maxLines and threshold is met', () => {
        const agents: AgentStatus[] = [
            { id: '1', status: 'Awaiting', queue: 'q1' },
            { id: '2', status: 'Awaiting', queue: 'q1' },
        ];
        const result = calculateScaleAction(agents, 30, config);
        expect(result.action).toBe('none');
        expect(result.newLines).toBe(30);
    });

    it('should decrease lines when no agents are waiting and at least one is in talk', () => {
        const agents: AgentStatus[] = [
            { id: '1', status: 'In talk', queue: 'q1' },
            { id: '2', status: 'Working issues', queue: 'q1' },
        ];
        const result = calculateScaleAction(agents, 20, config);
        expect(result.action).toBe('decrease');
        expect(result.newLines).toBe(19);
    });

    it('should not decrease lines below minLines', () => {
        const agents: AgentStatus[] = [
            { id: '1', status: 'In talk', queue: 'q1' },
        ];
        const result = calculateScaleAction(agents, 10, config);
        expect(result.action).toBe('none');
        expect(result.newLines).toBe(10);
    });

    it('should return none when not enough agents are waiting', () => {
        const agents: AgentStatus[] = [
            { id: '1', status: 'Awaiting', queue: 'q1' },
            { id: '2', status: 'In talk', queue: 'q1' },
        ];
        const result = calculateScaleAction(agents, 20, config);
        expect(result.action).toBe('none');
        expect(result.newLines).toBe(20);
    });
});
