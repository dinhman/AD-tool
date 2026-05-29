import sqlite3 from 'sqlite3';
import path from 'path';

export interface LogEntry {
    id: number;
    timestamp: string;
    message: string;
}

// Ensure the db file is created in the project root
const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize table
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            message TEXT
        )
    `);
});

/**
 * Insert a new log message into the database
 */
export function insertLog(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Also log to console for terminal debugging
        console.log(message);
        
        db.run('INSERT INTO logs (message) VALUES (?)', [message], function(err) {
            if (err) {
                console.error('Failed to insert log to DB:', err);
                reject(err);
            } else {
                // Tự động dọn dẹp: Chỉ giữ lại 1000 dòng log mới nhất để tránh DB bị phình to
                db.run('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 1000)');
                resolve();
            }
        });
    });
}

/**
 * Retrieve the latest logs from the database
 */
export function getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM logs ORDER BY id DESC LIMIT ?', [limit], (err, rows) => {
            if (err) {
                console.error('Failed to retrieve logs from DB:', err);
                reject(err);
            } else {
                resolve(rows as LogEntry[]);
            }
        });
    });
}
