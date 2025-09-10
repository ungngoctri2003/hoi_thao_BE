const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const { env } = require('../dist/config/env');

/**
 * Initialize the database with schema and seed data
 */
async function initDatabase() {
  let connection;

  try {
    console.log('🚀 Initializing database...');

    // Create connection
    connection = await oracledb.getConnection({
      user: env.db.user,
      password: env.db.password,
      connectString: env.db.connectString,
    });

    console.log('✅ Connected to Oracle database');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../src/database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Creating database schema...');
    await connection.execute(schemaSQL);
    console.log('✅ Database schema created successfully');

    // Read and execute seed data
    const seedPath = path.join(__dirname, '../src/database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');

    console.log('🌱 Inserting seed data...');
    await connection.execute(seedSQL);
    console.log('✅ Seed data inserted successfully');

    // Read and execute notifications schema
    const notificationsSchemaPath = path.join(
      __dirname,
      '../src/database/notifications-schema-oracle.sql'
    );
    if (fs.existsSync(notificationsSchemaPath)) {
      const notificationsSQL = fs.readFileSync(notificationsSchemaPath, 'utf8');
      console.log('📋 Creating notifications schema...');
      await connection.execute(notificationsSQL);
      console.log('✅ Notifications schema created successfully');
    }

    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
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
  initDatabase()
    .then(() => {
      console.log('✅ Database initialization completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
