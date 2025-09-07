const { withConn } = require('./dist/config/db');
const oracledb = require('oracledb');

async function debugAssignment() {
  try {
    console.log('=== Debug Assignment Creation ===\n');

    await withConn(async (conn) => {
      console.log('1. Testing direct insert...');
      
      const query = `
        INSERT INTO user_conference_assignments (user_id, conference_id, permissions, assigned_by)
        VALUES (:userId, :conferenceId, :permissions, :assignedBy)
        RETURNING id INTO :id
      `;
      
      const result = await conn.execute(query, {
        userId: 5,
        conferenceId: 1,
        permissions: JSON.stringify({ 'conferences.view': true }),
        assignedBy: 1,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }, { autoCommit: true });

      console.log('Insert result:', result);
      console.log('New ID:', result.outBinds.id[0]);

      console.log('\n2. Checking if data exists...');
      const checkResult = await conn.execute('SELECT * FROM user_conference_assignments WHERE user_id = 5', {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log('Check result:', checkResult.rows);

    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAssignment();
