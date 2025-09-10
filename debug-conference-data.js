const oracledb = require('oracledb');
const { withConn } = require('./dist/config/db.js');

async function checkData() {
  try {
    await withConn(async conn => {
      // Check all users in conference assignments
      const result1 = await conn.execute(`
      SELECT 
        uca.user_id,
        uca.conference_id,
        c.NAME as conference_name,
        u.NAME as user_name,
        u.EMAIL,
        r.CODE as role_code
      FROM user_conference_assignments uca
      JOIN conferences c ON uca.conference_id = c.ID
      LEFT JOIN APP_USERS u ON uca.user_id = u.ID
      LEFT JOIN user_roles ur ON u.ID = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.ID
      WHERE uca.is_active = 1
      ORDER BY c.NAME, u.NAME
    `);

      console.log('All conference assignments:');
      console.log(result1.rows);

      // Check attendees in conference assignments
      const result2 = await conn.execute(`
      SELECT 
        uca.user_id,
        uca.conference_id,
        c.NAME as conference_name,
        a.NAME as attendee_name,
        a.EMAIL
      FROM user_conference_assignments uca
      JOIN conferences c ON uca.conference_id = c.ID
      LEFT JOIN ATTENDEES a ON uca.user_id = a.ID
      WHERE uca.is_active = 1 AND a.EMAIL IS NOT NULL
      ORDER BY c.NAME, a.NAME
    `);

      console.log('\nAttendee conference assignments:');
      console.log(result2.rows);

      // Check all conferences
      const result3 = await conn.execute(`
      SELECT ID, NAME, START_DATE, END_DATE
      FROM conferences
      ORDER BY NAME
    `);

      console.log('\nAll conferences:');
      console.log(result3.rows);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
