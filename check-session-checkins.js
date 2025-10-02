require('dotenv').config();
const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'sys',
  password: process.env.DB_PASSWORD || 'Kenh14@2211',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XEPDB1',
  privilege: oracledb.SYSDBA
};

console.log('🔧 Database config:', {
  user: dbConfig.user,
  connectString: dbConfig.connectString,
  password: dbConfig.password ? '***' : 'not set'
});

async function checkSessionCheckins() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Check if CHECKINS table has SESSION_ID column
    console.log('📋 Checking CHECKINS table structure...');
    const columnCheck = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE 
       FROM USER_TAB_COLUMNS 
       WHERE TABLE_NAME = 'CHECKINS' 
       ORDER BY COLUMN_ID`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('Columns in CHECKINS table:');
    columnCheck.rows.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    });
    console.log();

    // Check session check-ins (where SESSION_ID is not null)
    console.log('🔍 Checking session check-ins...');
    const sessionCheckins = await connection.execute(
      `SELECT 
        c.ID as CHECKIN_ID,
        c.SESSION_ID,
        c.ACTION_TYPE,
        c.CHECKIN_TIME,
        s.TITLE as SESSION_TITLE,
        conf.NAME as CONFERENCE_NAME,
        a.NAME as ATTENDEE_NAME
       FROM CHECKINS c
       LEFT JOIN SESSIONS s ON c.SESSION_ID = s.ID
       LEFT JOIN REGISTRATIONS r ON c.REGISTRATION_ID = r.ID
       LEFT JOIN CONFERENCES conf ON r.CONFERENCE_ID = conf.ID
       LEFT JOIN ATTENDEES a ON r.ATTENDEE_ID = a.ID
       WHERE c.SESSION_ID IS NOT NULL
       ORDER BY c.CHECKIN_TIME DESC
       FETCH FIRST 10 ROWS ONLY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (sessionCheckins.rows.length === 0) {
      console.log('❌ No session check-ins found (all SESSION_ID are NULL)');
      console.log('\n💡 To test the feature, you need to:');
      console.log('   1. Create sessions for your conferences');
      console.log('   2. Use session check-in feature (not conference check-in)');
      console.log('   3. Make sure SESSION_ID is set when checking in\n');
    } else {
      console.log(`✅ Found ${sessionCheckins.rows.length} session check-ins:\n`);
      sessionCheckins.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.ATTENDEE_NAME || 'Unknown'}`);
        console.log(`   Session: ${row.SESSION_TITLE || 'N/A'}`);
        console.log(`   Conference: ${row.CONFERENCE_NAME || 'N/A'}`);
        console.log(`   Action: ${row.ACTION_TYPE}`);
        console.log(`   Time: ${row.CHECKIN_TIME}`);
        console.log();
      });
    }

    // Check total check-ins
    const totalCheckins = await connection.execute(
      `SELECT 
        COUNT(*) as TOTAL,
        SUM(CASE WHEN SESSION_ID IS NULL THEN 1 ELSE 0 END) as CONFERENCE_CHECKINS,
        SUM(CASE WHEN SESSION_ID IS NOT NULL THEN 1 ELSE 0 END) as SESSION_CHECKINS
       FROM CHECKINS`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('📊 Check-in Statistics:');
    console.log(`   Total check-ins: ${totalCheckins.rows[0].TOTAL}`);
    console.log(`   Conference-level check-ins: ${totalCheckins.rows[0].CONFERENCE_CHECKINS}`);
    console.log(`   Session-level check-ins: ${totalCheckins.rows[0].SESSION_CHECKINS}`);
    console.log();

    // Check available sessions
    const sessions = await connection.execute(
      `SELECT 
        s.ID,
        s.TITLE,
        c.NAME as CONFERENCE_NAME,
        s.START_TIME,
        s.END_TIME,
        s.STATUS
       FROM SESSIONS s
       JOIN CONFERENCES c ON s.CONFERENCE_ID = c.ID
       ORDER BY s.START_TIME DESC
       FETCH FIRST 5 ROWS ONLY`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (sessions.rows.length > 0) {
      console.log('📅 Available sessions for check-in:');
      sessions.rows.forEach((session, index) => {
        console.log(`${index + 1}. [ID: ${session.ID}] ${session.TITLE}`);
        console.log(`   Conference: ${session.CONFERENCE_NAME}`);
        console.log(`   Time: ${session.START_TIME} - ${session.END_TIME}`);
        console.log(`   Status: ${session.STATUS}`);
        console.log();
      });
    } else {
      console.log('❌ No sessions found. Please create sessions first.');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Database connection closed');
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Run the check
checkSessionCheckins();

