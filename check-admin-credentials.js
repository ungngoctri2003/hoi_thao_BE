const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function checkAdminCredentials() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check admin users
    console.log('\n📋 Checking admin users...');
    const adminResult = await conn.execute(
      `SELECT ID, EMAIL, NAME, STATUS, CREATED_AT FROM APP_USERS WHERE EMAIL LIKE '%admin%'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('Admin users found:', adminResult.rows);
    
    // Check all users
    console.log('\n👥 Checking all users...');
    const usersResult = await conn.execute(
      `SELECT ID, EMAIL, NAME, STATUS, CREATED_AT FROM APP_USERS ORDER BY CREATED_AT DESC`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('All users:', usersResult.rows);
    
    // Check if there are any users with admin role
    const adminRoleResult = await conn.execute(
      `SELECT u.ID, u.EMAIL, u.NAME, r.CODE as ROLE_CODE, r.NAME as ROLE_NAME 
       FROM APP_USERS u 
       LEFT JOIN ROLES r ON u.ROLE_ID = r.ID 
       WHERE r.CODE = 'admin'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('\n🔑 Users with admin role:', adminRoleResult.rows);
    
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

checkAdminCredentials().catch(console.error);
