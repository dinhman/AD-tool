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
    const res = await pool.request().query("SELECT Login, COUNT(*) as count FROM v_UserLatestStatus WHERE UserStatusId != -3 AND Login IN ('vy.vo', 'quynh.phan02', 'nga.le', 'muoi.nguyen', 'ky.le') GROUP BY Login");
    console.log(res.recordset);
    pool.close();
}
run();
