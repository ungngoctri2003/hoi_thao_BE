const { withConn } = require('./dist/config/db');

async function testAuditLogs() {
  try {
    console.log('Testing audit logs...');
    
    // Check if table exists and count records
    const countResult = await withConn(async (conn) => {
      return await conn.execute('SELECT COUNT(*) as count FROM AUDIT_LOGS');
    });
    
    console.log('Audit logs count:', countResult.rows[0][0]);
    
    // Get sample records
    const sampleResult = await withConn(async (conn) => {
      return await conn.execute(`
        SELECT ID, TS, USER_ID, ACTION_NAME, RESOURCE_NAME, DETAILS, 
               IP_ADDRESS, USER_AGENT, STATUS, CATEGORY 
        FROM AUDIT_LOGS 
        WHERE ROWNUM <= 3 
        ORDER BY TS DESC
      `);
    });
    
    console.log('Sample audit logs:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`Record ${index + 1}:`, {
        id: row[0],
        timestamp: row[1],
        userId: row[2],
        actionName: row[3],
        resourceName: row[4],
        details: row[5],
        ipAddress: row[6],
        userAgent: row[7],
        status: row[8],
        category: row[9]
      });
    });
    
  } catch (error) {
    console.error('Error testing audit logs:', error.message);
  }
}

testAuditLogs();
