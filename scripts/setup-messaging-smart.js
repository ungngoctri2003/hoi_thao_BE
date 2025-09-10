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

async function setupMessagingSmart() {
  let connection;

  try {
    console.log('🔌 Connecting to Oracle database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check existing objects
    console.log('\n🔍 Checking existing database objects...');
    const existingObjects = await checkExistingObjects(connection);

    // Define required objects
    const requiredTables = ['MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS'];

    const requiredIndexes = [
      'IDX_MS_USERS',
      'IDX_MS_CONFERENCE',
      'IDX_MM_SESSION',
      'IDX_MM_SENDER',
      'IDX_MM_ATTENDEE',
      'IDX_MM_CREATED_AT',
      'IDX_MU_USER',
      'IDX_MU_CONFERENCE',
    ];

    // Check what needs to be created
    const missingTables = requiredTables.filter(table => !existingObjects.tables.includes(table));
    const missingIndexes = requiredIndexes.filter(
      index => !existingObjects.indexes.includes(index)
    );

    console.log('\n📊 Analysis:');
    console.log(`✅ Existing tables: ${existingObjects.tables.length}/${requiredTables.length}`);
    console.log(`✅ Existing indexes: ${existingObjects.indexes.length}/${requiredIndexes.length}`);

    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
    }
    if (missingIndexes.length > 0) {
      console.log(`❌ Missing indexes: ${missingIndexes.join(', ')}`);
    }

    if (missingTables.length === 0 && missingIndexes.length === 0) {
      console.log('\n🎉 All messaging objects already exist! Nothing to create.');
      return;
    }

    // Read SQL file and create only missing objects
    console.log('\n📝 Creating missing objects...');
    const sqlFilePath = path.join(__dirname, '..', 'src', 'database', 'messaging-tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Parse and execute only what's needed
    await executeMissingObjects(connection, sqlContent, missingTables, missingIndexes);

    console.log('\n🎉 Smart setup completed!');

    // Verify final state
    console.log('\n🧪 Verifying final state...');
    const finalObjects = await checkExistingObjects(connection);
    console.log(`✅ Final tables: ${finalObjects.tables.length}/${requiredTables.length}`);
    console.log(`✅ Final indexes: ${finalObjects.indexes.length}/${requiredIndexes.length}`);
  } catch (error) {
    console.error('❌ Smart setup failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('\n🔌 Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

async function checkExistingObjects(connection) {
  try {
    // Check tables
    const tablesQuery = `
      SELECT table_name 
      FROM user_tables 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
    `;
    const tablesResult = await connection.execute(
      tablesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const tables = (tablesResult.rows || []).map(row => row.TABLE_NAME);

    // Check indexes
    const indexesQuery = `
      SELECT index_name 
      FROM user_indexes 
      WHERE index_name IN ('IDX_MS_USERS', 'IDX_MS_CONFERENCE', 'IDX_MM_SESSION', 
                          'IDX_MM_SENDER', 'IDX_MM_ATTENDEE', 'IDX_MM_CREATED_AT', 
                          'IDX_MU_USER', 'IDX_MU_CONFERENCE')
    `;
    const indexesResult = await connection.execute(
      indexesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const indexes = (indexesResult.rows || []).map(row => row.INDEX_NAME);

    return { tables, indexes };
  } catch (error) {
    console.error('Error checking existing objects:', error);
    return { tables: [], indexes: [] };
  }
}

async function executeMissingObjects(connection, sqlContent, missingTables, missingIndexes) {
  const statements = parseSQLStatements(sqlContent);

  for (const statement of statements) {
    if (statement.type === 'comment' || statement.type === 'empty') {
      continue;
    }

    let shouldExecute = false;
    let reason = '';

    if (statement.type === 'create_table') {
      if (missingTables.includes(statement.tableName)) {
        shouldExecute = true;
        reason = `Creating missing table: ${statement.tableName}`;
      } else {
        reason = `Table ${statement.tableName} already exists`;
      }
    } else if (statement.type === 'create_index') {
      if (missingIndexes.includes(statement.indexName)) {
        shouldExecute = true;
        reason = `Creating missing index: ${statement.indexName}`;
      } else {
        reason = `Index ${statement.indexName} already exists`;
      }
    } else if (
      statement.type === 'insert' ||
      statement.type === 'grant' ||
      statement.type === 'commit'
    ) {
      // Always execute these if we're creating tables
      if (missingTables.length > 0) {
        shouldExecute = true;
        reason = `Executing ${statement.type.toUpperCase()} statement`;
      } else {
        reason = `Skipping ${statement.type.toUpperCase()} - no tables created`;
      }
    }

    console.log(`\n🔄 ${reason}`);

    if (shouldExecute) {
      try {
        await connection.execute(statement.sql);
        console.log('✅ Executed successfully');
      } catch (error) {
        if (
          error.message.includes('ORA-00955') ||
          error.message.includes('name is already used') ||
          error.message.includes('already exists')
        ) {
          console.log('⚠️  Skipped (object already exists)');
        } else {
          console.error('❌ Error:', error.message);
        }
      }
    } else {
      console.log('⏭️  Skipped');
    }
  }
}

function parseSQLStatements(sqlContent) {
  const statements = [];
  const lines = sqlContent.split('\n');
  let currentStatement = '';

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
      const sql = currentStatement.trim().slice(0, -1);

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
    }
  }

  return statements;
}

// Run the smart setup
setupMessagingSmart().catch(console.error);
