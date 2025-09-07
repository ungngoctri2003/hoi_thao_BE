const oracledb = require('oracledb');

async function checkAuditLogs() {
  try {
    const connection = await oracledb.getConnection({
      user: 'C##HOI_THAO',
      password: 'hoithao123',
      connectString: 'localhost:1521/XE'
    });
    
    const result = await connection.execute('SELECT COUNT(*) as count FROM AUDIT_LOGS');
    console.log('Total audit logs:', result.rows[0][0]);
    
    const recentLogs = await connection.execute('SELECT * FROM (SELECT * FROM AUDIT_LOGS ORDER BY TS DESC) WHERE ROWNUM <= 5');
    console.log('Recent audit logs:');
    recentLogs.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row[1]} - ${row[2]} - ${row[3]} - ${row[4]}`);
    });
    
    await connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAuditLogs();
