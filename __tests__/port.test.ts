import * as fs from 'fs';
import * as path from 'path';

describe('Backend Port Configuration', () => {
    it('should have PORT set to 3005 in index.ts', () => {
        const indexPath = path.resolve(__dirname, '../src/index.ts');
        const content = fs.readFileSync(indexPath, 'utf-8');
        expect(content).toMatch(/const PORT = 3005;/);
    });
});
