const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'C##CONFERENCE',
  password: process.env.DB_PASSWORD || 'conference123',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XEPDB1',
  poolMin: 1,
  poolMax: 10,
  poolIncrement: 1,
  poolTimeout: 60,
};

async function setupMessagingDatabase() {
  let connection;

  try {
    console.log('🔌 Connecting to Oracle database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // First, check which tables already exist
    console.log('\n🔍 Checking existing tables...');
    const existingTables = await checkExistingTables(connection);

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'src', 'database', 'messaging-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Parse SQL content into structured statements
    const statements = parseSQLStatements(sqlContent);

    console.log(`📝 Found ${statements.length} SQL statements to process`);

    // Execute only the statements for tables that don't exist
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (statement.type === 'comment' || statement.type === 'empty') {
        continue;
      }

      // Check if this is a table creation statement
      if (statement.type === 'create_table') {
        const tableName = statement.tableName;
        if (existingTables.includes(tableName)) {
          console.log(`⚠️  Table ${tableName} already exists, skipping creation`);
          continue;
        }
      }

      // Check if this is an index creation statement
      if (statement.type === 'create_index') {
        const indexName = statement.indexName;
        if (existingTables.includes(indexName)) {
          console.log(`⚠️  Index ${indexName} already exists, skipping creation`);
          continue;
        }
      }

      try {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.sql.substring(0, 100) + (statement.sql.length > 100 ? '...' : ''));

        await connection.execute(statement.sql);
        console.log('✅ Statement executed successfully');
      } catch (error) {
        // Some statements might fail if objects already exist, which is okay
        if (
          error.message.includes('ORA-00955') ||
          error.message.includes('name is already used') ||
          error.message.includes('already exists')
        ) {
          console.log('⚠️  Statement skipped (object already exists)');
        } else {
          console.error('❌ Error executing statement:', error.message);
          // Continue with other statements
        }
      }
    }

    console.log('\n🎉 Messaging database setup completed!');

    // Test the setup by querying the new tables
    console.log('\n🧪 Testing database setup...');

    const testQueries = [
      'SELECT COUNT(*) as MESSAGING_SESSIONS_COUNT FROM MESSAGING_SESSIONS',
      'SELECT COUNT(*) as MESSAGING_MESSAGES_COUNT FROM MESSAGING_MESSAGES',
      'SELECT COUNT(*) as MESSAGING_USERS_COUNT FROM MESSAGING_USERS',
    ];

    for (const query of testQueries) {
      try {
        const result = await connection.execute(
          query,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const tableName = query.split(' ')[4].replace('_COUNT', '');
        const count = result.rows[0][Object.keys(result.rows[0])[0]];
        console.log(`✅ ${tableName}: ${count} records`);
      } catch (error) {
        console.error(`❌ Error testing ${query}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Database setup failed:', error);
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

// Helper function to check existing tables and indexes
async function checkExistingTables(connection) {
  try {
    // Check for tables
    const tableQuery = `
      SELECT table_name 
      FROM user_tables 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
    `;

    const tableResult = await connection.execute(
      tableQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const existingTables = (tableResult.rows || []).map(row => row.TABLE_NAME);

    // Check for indexes
    const indexQuery = `
      SELECT index_name 
      FROM user_indexes 
      WHERE index_name IN ('IDX_MS_USERS', 'IDX_MS_CONFERENCE', 'IDX_MM_SESSION', 
                          'IDX_MM_SENDER', 'IDX_MM_ATTENDEE', 'IDX_MM_CREATED_AT', 
                          'IDX_MU_USER', 'IDX_MU_CONFERENCE')
    `;

    const indexResult = await connection.execute(
      indexQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const existingIndexes = (indexResult.rows || []).map(row => row.INDEX_NAME);

    const allExisting = [...existingTables, ...existingIndexes];

    console.log('📋 Existing tables:', existingTables);
    console.log('📋 Existing indexes:', existingIndexes);

    return allExisting;
  } catch (error) {
    console.error('Error checking existing tables:', error);
    return [];
  }
}

// Helper function to parse SQL statements
function parseSQLStatements(sqlContent) {
  const statements = [];
  const lines = sqlContent.split('\n');
  let currentStatement = '';
  let inMultiLineStatement = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('--')) {
      if (line.startsWith('--')) {
        statements.push({
          type: 'comment',
          sql: line,
          lineNumber: i + 1,
        });
      } else {
        statements.push({
          type: 'empty',
          sql: '',
          lineNumber: i + 1,
        });
      }
      continue;
    }

    currentStatement += line + ' ';

    // Check if statement ends with semicolon
    if (line.endsWith(';')) {
      const sql = currentStatement.trim().slice(0, -1); // Remove trailing semicolon

      // Determine statement type
      let type = 'other';
      let tableName = null;
      let indexName = null;

      if (sql.toUpperCase().startsWith('CREATE TABLE')) {
        type = 'create_table';
        const match = sql.match(/CREATE TABLE\s+(\w+)/i);
        if (match) {
          tableName = match[1];
        }
      } else if (sql.toUpperCase().startsWith('CREATE INDEX')) {
        type = 'create_index';
        const match = sql.match(/CREATE INDEX\s+(\w+)/i);
        if (match) {
          indexName = match[1];
        }
      } else if (sql.toUpperCase().startsWith('INSERT INTO')) {
        type = 'insert';
      } else if (sql.toUpperCase().startsWith('GRANT')) {
        type = 'grant';
      } else if (sql.toUpperCase().startsWith('COMMIT')) {
        type = 'commit';
      }

      statements.push({
        type,
        sql,
        tableName,
        indexName,
        lineNumber: i + 1,
      });

      currentStatement = '';
      inMultiLineStatement = false;
    } else {
      inMultiLineStatement = true;
    }
  }

  // Handle any remaining statement without semicolon
  if (currentStatement.trim()) {
    statements.push({
      type: 'other',
      sql: currentStatement.trim(),
      lineNumber: lines.length,
    });
  }

  return statements;
}

// Run the setup
setupMessagingDatabase().catch(console.error);
