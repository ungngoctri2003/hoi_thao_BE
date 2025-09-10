const oracledb = require('oracledb');
const { env } = require('./dist/config/env');

/**
 * Check data in MESSAGING_USERS table
 */
async function checkMessagingData() {
  let connection;

  try {
    console.log('🔍 Checking MESSAGING_USERS table data...');

    // Create connection
    connection = await oracledb.getConnection({
      user: env.db.user,
      password: env.db.password,
      connectString: env.db.connectString,
    });

    console.log('✅ Connected to Oracle database');

    // Check if table exists and get data
    const checkTableQuery = `
      SELECT COUNT(*) as table_count 
      FROM USER_TABLES 
      WHERE TABLE_NAME = 'MESSAGING_USERS'
    `;

    const tableResult = await connection.execute(
      checkTableQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('📊 MESSAGING_USERS table exists:', tableResult.rows[0].TABLE_COUNT > 0);

    if (tableResult.rows[0].TABLE_COUNT > 0) {
      // Get data from MESSAGING_USERS
      const dataQuery = `
        SELECT 
          mu.ID,
          mu.USER_ID,
          mu.USER_TYPE,
          mu.CONFERENCE_ID,
          mu.IS_ACTIVE,
          mu.MESSAGE_COUNT,
          mu.LAST_MESSAGE_TIME,
          mu.ADDED_AT
        FROM MESSAGING_USERS mu
        ORDER BY mu.ADDED_AT DESC
      `;

      const dataResult = await connection.execute(
        dataQuery,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      console.log('📋 MESSAGING_USERS data count:', dataResult.rows.length);

      if (dataResult.rows.length > 0) {
        console.log('📄 First few records:');
        dataResult.rows.slice(0, 5).forEach((row, index) => {
          console.log(
            `  ${index + 1}. User ID: ${row.USER_ID}, Type: ${row.USER_TYPE}, Active: ${
              row.IS_ACTIVE
            }, Messages: ${row.MESSAGE_COUNT}`
          );
        });
      } else {
        console.log('⚠️  No data in MESSAGING_USERS table');
      }
    }

    // Also check APP_USERS and ATTENDEES for reference
    const appUsersQuery = `SELECT COUNT(*) as count FROM APP_USERS WHERE STATUS = 'active'`;
    const appUsersResult = await connection.execute(
      appUsersQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('👥 Active APP_USERS count:', appUsersResult.rows[0].COUNT);

    const attendeesQuery = `SELECT COUNT(*) as count FROM ATTENDEES WHERE EMAIL IS NOT NULL`;
    const attendeesResult = await connection.execute(
      attendeesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('🎫 ATTENDEES with email count:', attendeesResult.rows[0].COUNT);
  } catch (error) {
    console.error('❌ Error checking MESSAGING_USERS data:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('⚠️  Error closing connection:', closeError);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkMessagingData()
    .then(() => {
      console.log('✅ Data check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Data check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkMessagingData };
