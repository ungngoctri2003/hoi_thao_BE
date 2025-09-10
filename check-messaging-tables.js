const oracledb = require('oracledb');
const { withConn } = require('./dist/config/db');

async function checkMessagingTables() {
  try {
    console.log('🔍 Checking messaging tables...');

    const result = await withConn(async conn => {
      const query = await conn.execute(
        `SELECT table_name, 
                CASE WHEN table_name IN (
                  'MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS'
                ) THEN 'required' ELSE 'optional' END as table_type
         FROM user_tables 
         WHERE table_name IN (
           'MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS'
         )
         ORDER BY table_name`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return query.rows || [];
    });

    console.log('📊 Messaging tables status:');
    result.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME} - ${table.TABLE_TYPE}`);
    });

    if (result.length === 3) {
      console.log('🎉 All messaging tables exist!');
    } else {
      console.log('⚠️  Some messaging tables are missing. Need to create them.');
      console.log(
        'Missing tables:',
        ['MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS'].filter(
          table => !result.some(r => r.TABLE_NAME === table)
        )
      );
    }
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  }
}

checkMessagingTables();
