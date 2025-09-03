// Simple script to reset admin password
const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  let connection;
  
  try {
    // Database connection
    connection = await oracledb.getConnection({
      user: 'HOI_THAO',
      password: '21082003',
      connectString: 'localhost:1521/XE'
    });
    
    console.log('Connected to database');
    
    // Hash the new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update admin password
    const result = await connection.execute(
      `UPDATE APP_USERS 
       SET PASSWORD_HASH = :passwordHash, STATUS = 'active' 
       WHERE EMAIL = 'admin@conference.vn'`,
      { passwordHash: hashedPassword },
      { autoCommit: true }
    );
    
    console.log('Admin password updated successfully');
    console.log('Email: admin@conference.vn');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

resetAdminPassword();
