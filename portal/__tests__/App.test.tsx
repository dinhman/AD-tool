describe('App Component Configuration Check', () => {
    it('should connect to the correct backend port 3005', () => {
        const fs = require('fs');
        const path = require('path');
        const appPath = path.resolve(__dirname, '../src/App.tsx');
        const content = fs.readFileSync(appPath, 'utf-8');
        expect(content).toMatch(/http:\/\/localhost:3005\/api\//);
        expect(content).not.toMatch(/http:\/\/localhost:3000\/api\//);
    });
});
