const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function createAdminUser() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if admin user exists
    console.log('\n📋 Checking admin user...');
    const adminResult = await conn.execute(
      `SELECT ID, EMAIL, NAME, STATUS FROM APP_USERS WHERE EMAIL = 'admin@conference.vn'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (adminResult.rows.length > 0) {
      console.log('✅ Admin user exists:', adminResult.rows[0]);
      
      // Update admin password to a known value
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await conn.execute(
        `UPDATE APP_USERS SET PASSWORD_HASH = :password WHERE EMAIL = 'admin@conference.vn'`,
        { password: hashedPassword },
        { autoCommit: true }
      );
      
      console.log('✅ Admin password updated to: admin123');
      
      // Check if admin has role assigned
      const roleCheck = await conn.execute(
        `SELECT r.CODE, r.NAME FROM APP_USERS u 
         LEFT JOIN ROLES r ON u.ROLE_ID = r.ID 
         WHERE u.EMAIL = 'admin@conference.vn'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      console.log('Admin role:', roleCheck.rows[0]);
      
      if (!roleCheck.rows[0].CODE) {
        // Assign admin role
        const adminRoleResult = await conn.execute(
          `SELECT ID FROM ROLES WHERE CODE = 'admin'`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (adminRoleResult.rows.length > 0) {
          const adminRoleId = adminRoleResult.rows[0].ID;
          
          await conn.execute(
            `UPDATE APP_USERS SET ROLE_ID = :roleId WHERE EMAIL = 'admin@conference.vn'`,
            { roleId: adminRoleId },
            { autoCommit: true }
          );
          
          console.log('✅ Admin role assigned');
        }
      }
      
    } else {
      console.log('❌ Admin user not found, creating...');
      
      // Get admin role ID
      const adminRoleResult = await conn.execute(
        `SELECT ID FROM ROLES WHERE CODE = 'admin'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      if (adminRoleResult.rows.length === 0) {
        console.log('❌ Admin role not found');
        return;
      }
      
      const adminRoleId = adminRoleResult.rows[0].ID;
      
      // Create admin user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await conn.execute(
        `INSERT INTO APP_USERS (EMAIL, PASSWORD_HASH, NAME, STATUS, ROLE_ID, CREATED_AT) 
         VALUES (:email, :password, :name, :status, :roleId, SYSDATE)`,
        {
          email: 'admin@conference.vn',
          password: hashedPassword,
          name: 'Admin',
          status: 'active',
          roleId: adminRoleId
        },
        { autoCommit: true }
      );
      
      console.log('✅ Admin user created with password: admin123');
    }
    
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

createAdminUser().catch(console.error);
