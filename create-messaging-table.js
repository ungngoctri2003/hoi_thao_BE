const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const { env } = require('./dist/config/env');

/**
 * Create MESSAGING_USERS table
 */
async function createMessagingTable() {
  let connection;

  try {
    console.log('🚀 Creating MESSAGING_USERS table...');

    // Create connection
    connection = await oracledb.getConnection({
      user: env.db.user,
      password: env.db.password,
      connectString: env.db.connectString,
    });

    console.log('✅ Connected to Oracle database');

    // Read and execute messaging-users.sql
    const messagingUsersPath = path.join(__dirname, './src/database/messaging-users.sql');
    const messagingUsersSQL = fs.readFileSync(messagingUsersPath, 'utf8');

    console.log('📋 Creating MESSAGING_USERS table...');

    // Split SQL by semicolon and execute each statement separately
    const statements = messagingUsersSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'END' && stmt !== '/');

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await connection.execute(statement);
        } catch (error) {
          if (error.message.includes('ORA-00955') || error.message.includes('already exists')) {
            console.log('⚠️  Table or constraint already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ MESSAGING_USERS table created successfully!');
  } catch (error) {
    console.error('❌ Error creating MESSAGING_USERS table:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('⚠️  Error closing connection:', closeError);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  createMessagingTable()
    .then(() => {
      console.log('✅ MESSAGING_USERS table creation completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ MESSAGING_USERS table creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createMessagingTable };
