const sql = require('mssql');
async function run() {
    const config = {
        server: 'db01.vnfin.vn',
        user: 'monitor',
        password: '5XL696a04bFiy63j',
        database: 'DeltaTellBox',
        options: { encrypt: false, trustServerCertificate: true }
    };
    const pool = await sql.connect(config);
    const res = await pool.request().query(`
        SELECT TOP 1 * FROM v_UserLatestStatus
    `);
    console.log(Object.keys(res.recordset[0]));
    pool.close();
}
run();
