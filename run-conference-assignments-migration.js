const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'oracle',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE',
  privilege: oracledb.SYSDBA
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Oracle Database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to Oracle Database');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src', 'database', 'user-conference-assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Reading migration file...');
    console.log('📝 Migration SQL:');
    console.log(migrationSQL);
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`\n🚀 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n📋 Statement ${i + 1}:`);
          console.log(statement);
          
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes('ORA-00955') || error.message.includes('name is already used')) {
            console.log(`⚠️  Statement ${i + 1} skipped (object already exists)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Created user_conference_assignments table');
    console.log('- Added foreign key constraints');
    console.log('- Created indexes for performance');
    console.log('- Added table and column comments');
    
    // Verify the table was created
    console.log('\n🔍 Verifying table creation...');
    const verifyQuery = `
      SELECT table_name, column_name, data_type, nullable
      FROM user_tab_columns 
      WHERE table_name = 'USER_CONFERENCE_ASSIGNMENTS'
      ORDER BY column_id
    `;
    
    const result = await connection.execute(verifyQuery);
    console.log('📋 Table structure:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

// Run the migration
runMigration().catch(console.error);
