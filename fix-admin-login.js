const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminLogin() {
  let connection;
  
  try {
    const dbConfig = {
      user: process.env.DB_USER || 'HOI_THAO',
      password: process.env.DB_PASSWORD || '21082003',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    };
    
    console.log('🔌 Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Check if admin user exists
    const adminResult = await connection.execute(
      `SELECT ID, EMAIL, NAME, PASSWORD_HASH, STATUS FROM APP_USERS WHERE EMAIL = 'admin@conference.vn'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (adminResult.rows.length > 0) {
      const user = adminResult.rows[0];
      console.log('👤 Admin user found:', { 
        ID: user.ID, 
        EMAIL: user.EMAIL, 
        NAME: user.NAME,
        STATUS: user.STATUS || 'active'
      });
      
      // Reset password to admin123
      console.log('🔐 Resetting admin password to "admin123"...');
      const newPasswordHash = await bcrypt.hash('admin123', 10);
      
      await connection.execute(
        `UPDATE APP_USERS SET PASSWORD_HASH = :passwordHash, STATUS = 'active' WHERE ID = :id`,
        { passwordHash: newPasswordHash, id: user.ID },
        { autoCommit: true }
      );
      
      console.log('✅ Admin password reset successfully');
      console.log('📧 Email: admin@conference.vn');
      console.log('🔑 Password: admin123');
      
    } else {
      console.log('❌ Admin user not found. Creating admin user...');
      
      // Create admin user
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      const insertResult = await connection.execute(
        `INSERT INTO APP_USERS (EMAIL, NAME, PASSWORD_HASH, STATUS, AVATAR_URL) 
         VALUES ('admin@conference.vn', 'Admin User', :passwordHash, 'active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face') 
         RETURNING ID INTO :ID`,
        { 
          passwordHash: passwordHash,
          ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: true }
      );
      
      const adminId = insertResult.outBinds.ID[0];
      console.log(`✅ Admin user created with ID: ${adminId}`);
      
      // Assign admin role
      const roleResult = await connection.execute(
        `SELECT ID FROM ROLES WHERE CODE = 'admin'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      if (roleResult.rows.length > 0) {
        const adminRoleId = roleResult.rows[0].ID;
        await connection.execute(
          `INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (:userId, :roleId)`,
          { userId: adminId, roleId: adminRoleId },
          { autoCommit: true }
        );
        console.log('✅ Admin role assigned');
      } else {
        console.log('⚠️  Admin role not found in database');
      }
      
      console.log('📧 Email: admin@conference.vn');
      console.log('🔑 Password: admin123');
    }
    
    // Test the login
    console.log('\n🧪 Testing login...');
    const testResult = await connection.execute(
      `SELECT ID, EMAIL, NAME, PASSWORD_HASH FROM APP_USERS WHERE EMAIL = 'admin@conference.vn'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (testResult.rows.length > 0) {
      const user = testResult.rows[0];
      const isValid = await bcrypt.compare('admin123', user.PASSWORD_HASH);
      console.log(`🔐 Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

fixAdminLogin();
