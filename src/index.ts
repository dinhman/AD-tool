import express from 'express';
import cors from 'cors';
import { getConfig, saveConfig } from './config';
import { AutoScaleDaemon } from './daemon';
import { mouse } from '@nut-tree-fork/nut-js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3005;
const daemon = new AutoScaleDaemon();

app.get('/api/config', (req, res) => {
    const config = getConfig();
    res.json(config);
});

app.post('/api/config', (req, res) => {
    const newConfig = req.body;
    const success = saveConfig(newConfig);
    if (success) {
        // Update daemon config dynamically
        daemon.updateConfig(newConfig);
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Failed to save config' });
    }
});

app.post('/api/bot/start', (req, res) => {
    daemon.start();
    res.json({ success: true, isRunning: daemon.getIsRunning() });
});

app.post('/api/bot/stop', (req, res) => {
    daemon.stop();
    res.json({ success: true, isRunning: daemon.getIsRunning() });
});

app.get('/api/bot/status', (req, res) => {
    res.json({ isRunning: daemon.getIsRunning() });
});

import { getRecentLogs } from './db';

app.get('/api/dashboard', async (req, res) => {
    try {
        const logs = await getRecentLogs(50);
        res.json({
            isRunning: daemon.getIsRunning(),
            stats: daemon.lastStats,
            agents: daemon.lastAgents,
            logs: logs
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

app.get('/api/mouse-capture', async (req, res) => {
    // Wait for 5 seconds so user can point their mouse
    setTimeout(async () => {
        try {
            const pos = await mouse.getPosition();
            res.json({ x: pos.x, y: pos.y });
        } catch (e) {
            res.status(500).json({ error: 'Failed to read mouse position' });
        }
    }, 5000);
});

app.post('/api/bot/test-click', async (req, res) => {
    try {
        console.log(`[API] Test Auto Click sequence initiated. Waiting 5s...`);
        res.json({ success: true, message: `Bắt đầu bài test! Vui lòng thả tay khỏi chuột và quan sát phần mềm trong 5 giây tới.` });

        // Run the sequence in background so we don't block the HTTP response
        setTimeout(async () => {
            const sequence = [11, 22, 33, 44, 33, 22, 11];
            for (const lines of sequence) {
                console.log(`[API] Test sequence: Typing ${lines} lines`);
                const success = await daemon.testClick(lines);
                if (!success) {
                    console.log(`[API] Test sequence failed at ${lines} lines.`);
                    break;
                }
                await new Promise(r => setTimeout(r, 3000));
            }
            console.log(`[API] Test Auto Click sequence finished.`);
        }, 5000);
    } catch (e) {
        console.error('Test click error:', e);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to initiate test click' });
    }
});

app.listen(PORT, () => {
    console.log(`[Server] Web Portal API is running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down...');
    daemon.stop();
    process.exit(0);
});
