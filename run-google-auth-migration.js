const oracledb = require('oracledb');
const fs = require('fs');

async function runMigration() {
  let connection;
  try {
    // Kết nối database
    connection = await oracledb.getConnection({
      user: process.env.DB_USER || 'system',
      password: process.env.DB_PASSWORD || 'oracle',
      connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
    });

    console.log('✅ Connected to Oracle database');

    // Đọc migration SQL
    const migrationSQL = fs.readFileSync('google-auth-migration.sql', 'utf8');
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log('🔄 Executing:', statement.trim());
          await connection.execute(statement.trim());
          console.log('✅ Success');
        } catch (error) {
          if (error.message.includes('ORA-00955') || error.message.includes('already exists')) {
            console.log('⚠️  Column/Index already exists, skipping...');
          } else {
            console.error('❌ Error:', error.message);
          }
        }
      }
    }

    await connection.close();
    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError.message);
      }
    }
  }
}

runMigration();
