const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function checkTableStructure() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check APP_USERS table structure
    console.log('\n📋 Checking APP_USERS table structure...');
    const tableResult = await conn.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
       FROM USER_TAB_COLUMNS 
       WHERE TABLE_NAME = 'APP_USERS' 
       ORDER BY COLUMN_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('APP_USERS columns:', tableResult.rows);
    
    // Check if there's a password column
    const passwordColumns = tableResult.rows.filter(row => 
      row.COLUMN_NAME.toLowerCase().includes('password') || 
      row.COLUMN_NAME.toLowerCase().includes('pass')
    );
    
    console.log('\n🔑 Password-related columns:', passwordColumns);
    
    // Check sample data from APP_USERS
    console.log('\n👥 Sample APP_USERS data:');
    const sampleResult = await conn.execute(
      `SELECT * FROM APP_USERS WHERE ROWNUM <= 3`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('Sample data:', sampleResult.rows);
    
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

checkTableStructure().catch(console.error);
