const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function checkAttendeesStructure() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check ATTENDEES table structure
    console.log('\n📋 Checking ATTENDEES table structure...');
    const tableResult = await conn.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
       FROM USER_TAB_COLUMNS 
       WHERE TABLE_NAME = 'ATTENDEES' 
       ORDER BY COLUMN_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('ATTENDEES columns:');
    tableResult.rows.forEach(row => {
      console.log(`  ${row.COLUMN_NAME}: ${row.DATA_TYPE}(${row.DATA_LENGTH}) ${row.NULLABLE === 'Y' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check if ADDRESS column exists
    const addressColumn = tableResult.rows.find(row => 
      row.COLUMN_NAME === 'ADDRESS'
    );
    
    console.log('\n🏠 ADDRESS column exists:', !!addressColumn);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('\n🔌 Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error.message);
      }
    }
  }
}

checkAttendeesStructure().catch(console.error);
