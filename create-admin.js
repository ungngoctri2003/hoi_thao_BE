const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const { env } = require('./dist/config/env');

async function createAdmin() {
  let connection;
  
  try {
    console.log('🚀 Connecting to database...');
    
    connection = await oracledb.getConnection({
      user: env.db.user,
      password: env.db.password,
      connectString: env.db.connectString,
    });
    
    console.log('✅ Connected to Oracle database');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Check if admin user already exists
    const checkResult = await connection.execute(
      'SELECT COUNT(*) as count FROM APP_USERS WHERE EMAIL = :email',
      { email: 'admin@example.com' },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (checkResult.rows[0].COUNT > 0) {
      console.log('👤 Admin user already exists');
      return;
    }
    
    // Create admin user
    const result = await connection.execute(
      `INSERT INTO APP_USERS (EMAIL, NAME, PASSWORD_HASH, STATUS, CREATED_AT) 
       VALUES (:email, :name, :passwordHash, :status, CURRENT_TIMESTAMP)`,
      {
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: hashedPassword,
        status: 'active'
      }
    );
    
    await connection.commit();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: password123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

createAdmin();
