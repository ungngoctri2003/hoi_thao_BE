const { withConn } = require('./dist/config/db');
const oracledb = require('oracledb');

async function debugCreateSimple() {
  try {
    console.log('=== Debug Simple Create ===\n');

    await withConn(async (conn) => {
      console.log('1. Testing simple insert with CLOB...');
      
      const query = `
        INSERT INTO user_conference_assignments (user_id, conference_id, permissions, assigned_by)
        VALUES (:userId, :conferenceId, :permissions, :assignedBy)
        RETURNING id INTO :id
      `;
      
      const permissionsJson = JSON.stringify({ 'conferences.view': true });
      
      console.log('Permissions JSON:', permissionsJson);
      
      const result = await conn.execute(query, {
        userId: 28,
        conferenceId: 1,
        permissions: { type: oracledb.CLOB, dir: oracledb.BIND_IN, val: permissionsJson },
        assignedBy: 1,
        id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      }, { autoCommit: true });

      console.log('Insert result:', result);
      console.log('New ID:', result.outBinds.id[0]);

      console.log('\n2. Checking if data exists...');
      const checkResult = await conn.execute('SELECT * FROM user_conference_assignments WHERE user_id = 28', {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log('Check result count:', checkResult.rows.length);
      
      if (checkResult.rows.length > 0) {
        console.log('Assignment found:', {
          id: checkResult.rows[0].ID,
          userId: checkResult.rows[0].USER_ID,
          conferenceId: checkResult.rows[0].CONFERENCE_ID,
          isActive: checkResult.rows[0].IS_ACTIVE
        });
      }

    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCreateSimple();
