const oracledb = require('oracledb');
require('dotenv').config();

async function checkUsers() {
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
    
    // Check users in APP_USERS table
    const result = await connection.execute(
      `SELECT ID, EMAIL, NAME, AVATAR_URL FROM APP_USERS ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('Users in APP_USERS table:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.ID}, Email: ${user.EMAIL}, Name: ${user.NAME}, Avatar: ${user.AVATAR_URL || 'None'}`);
    });
    
    // Check if admin user exists
    const adminResult = await connection.execute(
      `SELECT ID, EMAIL, NAME FROM APP_USERS WHERE EMAIL = 'admin@conference.vn'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (adminResult.rows.length > 0) {
      console.log('\nAdmin user found:', adminResult.rows[0]);
    } else {
      console.log('\nAdmin user not found. Creating admin user...');
      
      // Create admin user
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      const insertResult = await connection.execute(
        `INSERT INTO APP_USERS (EMAIL, NAME, PASSWORD_HASH, AVATAR_URL) 
         VALUES ('admin@conference.vn', 'Admin User', :passwordHash, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face') 
         RETURNING ID INTO :ID`,
        { 
          passwordHash: passwordHash,
          ID: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: true }
      );
      
      const adminId = insertResult.outBinds.ID[0];
      console.log(`Admin user created with ID: ${adminId}`);
      
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
        console.log('Admin role assigned');
      }
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

checkUsers();
