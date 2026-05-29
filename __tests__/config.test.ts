import { getDefaultConfig } from '../src/config';

describe('Config Logic', () => {
    it('should provide default configuration', () => {
        const defaultConfig = getDefaultConfig();
        expect(defaultConfig.general.thresholdWaiting).toBe(2);
        expect(defaultConfig.general.minLines).toBe(10);
        expect(defaultConfig.database.server).toBe('127.0.0.1');
        expect(defaultConfig.click.camp1_inputX).toBe(0);
    });
});
