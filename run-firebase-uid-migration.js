const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function runFirebaseUidMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    
    // Database connection configuration
    const dbConfig = {
      user: process.env.DB_USER || 'cms_user',
      password: process.env.DB_PASSWORD || 'cms_password',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE',
      poolMin: 1,
      poolMax: 1,
      poolIncrement: 0
    };

    connection = await oracledb.getConnection(dbConfig);
    console.log('Connected to database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../conference-management-system/db/add-firebase-uid.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running Firebase UID migration...');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await connection.execute(statement);
          console.log('✓ Success');
        } catch (error) {
          if (error.message.includes('ORA-00955') || error.message.includes('already exists')) {
            console.log('⚠ Column or index already exists, skipping...');
          } else {
            console.error('✗ Error:', error.message);
            throw error;
          }
        }
      }
    }

    await connection.commit();
    console.log('Firebase UID migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    if (connection) {
      await connection.rollback();
    }
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

runFirebaseUidMigration();

