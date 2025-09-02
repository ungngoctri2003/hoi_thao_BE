const oracledb = require('oracledb');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Get database connection from environment
    const dbConfig = {
      user: process.env.DB_USER || 'HOI_THAO',
      password: process.env.DB_PASSWORD || '21082003',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    };
    
    console.log('Connecting to database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to database');
    
    // Check if AVATAR_URL column already exists
    const checkColumn = await connection.execute(
      `SELECT COUNT(*) as count FROM USER_TAB_COLUMNS 
       WHERE TABLE_NAME = 'APP_USERS' AND COLUMN_NAME = 'AVATAR_URL'`
    );
    
    const columnExists = checkColumn.rows[0][0] > 0;
    
    if (columnExists) {
      console.log('AVATAR_URL column already exists in APP_USERS table');
    } else {
      console.log('Adding AVATAR_URL column to APP_USERS table...');
      
      // Add the column
      await connection.execute(`ALTER TABLE APP_USERS ADD AVATAR_URL VARCHAR2(500)`);
      console.log('Column added successfully');
      
      // Add comment
      await connection.execute(`COMMENT ON COLUMN APP_USERS.AVATAR_URL IS 'URL of user avatar image'`);
      console.log('Comment added successfully');
      
      // Update existing users with sample avatars
      await connection.execute(
        `UPDATE APP_USERS SET AVATAR_URL = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' WHERE ID = 1`
      );
      await connection.execute(
        `UPDATE APP_USERS SET AVATAR_URL = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' WHERE ID = 2`
      );
      console.log('Sample avatars added');
      
      await connection.commit();
      console.log('Migration completed successfully');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    if (connection) {
      await connection.rollback();
    }
  } finally {
    if (connection) {
      await connection.close();
      console.log('Database connection closed');
    }
  }
}

runMigration();
