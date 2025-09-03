const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupNotificationsDatabase() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'conference_management',
      multipleStatements: true
    });

    console.log('🔗 Connected to database');

    // Read the schema file
    const schemaPath = path.join(__dirname, 'src', 'database', 'notifications-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading notifications schema...');

    // Execute the schema
    await connection.execute(schema);
    console.log('✅ Notifications database schema created successfully!');

    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('notifications', 'notification_templates', 'notification_preferences', 'notification_logs')
    `, [process.env.DB_NAME || 'conference_management']);

    console.log('📊 Created tables:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });

    // Check if templates were inserted
    const [templateCount] = await connection.execute('SELECT COUNT(*) as count FROM notification_templates');
    console.log(`📝 Inserted ${templateCount[0].count} notification templates`);

    // Check if preferences were created for existing users
    const [preferenceCount] = await connection.execute('SELECT COUNT(*) as count FROM notification_preferences');
    console.log(`⚙️  Created ${preferenceCount[0].count} notification preferences for users`);

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
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
setupNotificationsDatabase();
