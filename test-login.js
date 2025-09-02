const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin() {
  let connection;
  
  try {
    const dbConfig = {
      user: process.env.DB_USER || 'HOI_THAO',
      password: process.env.DB_PASSWORD || '21082003',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    };
    
    console.log('Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to database');
    
    // Get admin user
    const result = await connection.execute(
      `SELECT ID, EMAIL, NAME, PASSWORD_HASH FROM APP_USERS WHERE EMAIL = 'admin@conference.vn'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Admin user found:', { ID: user.ID, EMAIL: user.EMAIL, NAME: user.NAME });
      
      // Test different passwords
      const passwords = ['admin123', 'admin', 'password', '123456', '21082003'];
      
      for (const password of passwords) {
        const isValid = await bcrypt.compare(password, user.PASSWORD_HASH);
        console.log(`Password "${password}": ${isValid ? 'VALID' : 'INVALID'}`);
        if (isValid) {
          console.log(`✅ Correct password is: ${password}`);
          break;
        }
      }
      
      // If no password works, let's reset it
      console.log('\nResetting admin password to "admin123"...');
      const newPasswordHash = await bcrypt.hash('admin123', 10);
      await connection.execute(
        `UPDATE APP_USERS SET PASSWORD_HASH = :passwordHash WHERE ID = :id`,
        { passwordHash: newPasswordHash, id: user.ID },
        { autoCommit: true }
      );
      console.log('Password reset successfully');
      
    } else {
      console.log('Admin user not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.close();
      console.log('Database connection closed');
    }
  }
}

testLogin();
