const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

async function setupNotificationsDatabase() {
  let connection;
  
  try {
    // Create connection using Oracle configuration
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'your_username',
      password: process.env.DB_PASSWORD || 'your_password',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    });

    console.log('🔗 Connected to Oracle database');

    // Read the Oracle schema file
    const schemaPath = path.join(__dirname, 'src', 'database', 'notifications-schema-oracle.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading notifications schema...');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed statement successfully');
        } catch (error) {
          if (error.message.includes('ORA-00955') || error.message.includes('already exists')) {
            console.log('⚠️  Object already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }

    console.log('✅ Notifications database schema created successfully!');

    // Verify tables were created
    const tablesResult = await connection.execute(`
      SELECT TABLE_NAME 
      FROM USER_TABLES 
      WHERE TABLE_NAME IN ('NOTIFICATIONS', 'NOTIFICATION_TEMPLATES', 'NOTIFICATION_PREFERENCES', 'NOTIFICATION_LOGS')
    `);

    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row[0]}`);
    });

    // Check if templates were inserted
    const templateResult = await connection.execute('SELECT COUNT(*) as count FROM notification_templates');
    console.log(`📝 Inserted ${templateResult.rows[0][0]} notification templates`);

    // Check if preferences were created for existing users
    const preferenceResult = await connection.execute('SELECT COUNT(*) as count FROM notification_preferences');
    console.log(`⚙️  Created ${preferenceResult.rows[0][0]} notification preferences for users`);

    console.log('\n🎉 Notifications system setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test the notification API endpoints');
    console.log('   3. Use the AdminNotificationManager component in frontend');

  } catch (error) {
    console.error('❌ Error setting up notifications database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
setupNotificationsDatabase();
