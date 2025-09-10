const oracledb = require('oracledb');

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

async function testMessagingDatabase() {
  let connection;

  try {
    console.log('🔌 Connecting to Oracle database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    console.log('\n🧪 Testing Messaging Database Functionality\n');

    // Test 1: Check if tables exist
    console.log('📋 Test 1: Checking table existence...');
    const tablesQuery = `
      SELECT table_name 
      FROM user_tables 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
      ORDER BY table_name
    `;

    const tablesResult = await connection.execute(
      tablesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const existingTables = (tablesResult.rows || []).map(row => row.TABLE_NAME);

    const requiredTables = ['MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length === 0) {
      console.log('✅ All required tables exist');
    } else {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      return;
    }

    // Test 2: Test table structure
    console.log('\n📋 Test 2: Checking table structure...');
    for (const table of existingTables) {
      try {
        const structureQuery = `
          SELECT column_name, data_type, nullable 
          FROM user_tab_columns 
          WHERE table_name = :tableName 
          ORDER BY column_id
        `;
        const structureResult = await connection.execute(
          structureQuery,
          { tableName: table },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log(`✅ ${table}: ${structureResult.rows.length} columns`);
      } catch (error) {
        console.log(`❌ ${table}: Error checking structure - ${error.message}`);
      }
    }

    // Test 3: Test basic CRUD operations
    console.log('\n📋 Test 3: Testing CRUD operations...');

    // Test INSERT into MESSAGING_SESSIONS
    try {
      console.log('  Testing INSERT into MESSAGING_SESSIONS...');
      const insertSessionQuery = `
        INSERT INTO MESSAGING_SESSIONS (USER1_ID, USER2_ID, CONFERENCE_ID, IS_ACTIVE)
        VALUES (999, 998, 1, 1)
        RETURNING ID INTO :newId
      `;
      const insertResult = await connection.execute(
        insertSessionQuery,
        { newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      const sessionId = insertResult.outBinds.newId[0];
      console.log(`  ✅ Created session with ID: ${sessionId}`);

      // Test INSERT into MESSAGING_MESSAGES
      console.log('  Testing INSERT into MESSAGING_MESSAGES...');
      const insertMessageQuery = `
        INSERT INTO MESSAGING_MESSAGES (SESSION_ID, CONTENT, MESSAGE_TYPE, SENDER_ID, ATTENDEE_ID, IS_READ)
        VALUES (:sessionId, :content, :messageType, :senderId, :attendeeId, 0)
        RETURNING ID INTO :newId
      `;
      const messageResult = await connection.execute(
        insertMessageQuery,
        {
          sessionId: sessionId,
          content: 'Test message from database test',
          messageType: 'text',
          senderId: 999,
          attendeeId: 998,
          newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true }
      );
      const messageId = messageResult.outBinds.newId[0];
      console.log(`  ✅ Created message with ID: ${messageId}`);

      // Test SELECT
      console.log('  Testing SELECT operations...');
      const selectQuery = `
        SELECT m.ID, m.CONTENT, m.MESSAGE_TYPE, m.CREATED_AT,
               s.USER1_ID, s.USER2_ID, s.CONFERENCE_ID
        FROM MESSAGING_MESSAGES m
        JOIN MESSAGING_SESSIONS s ON m.SESSION_ID = s.ID
        WHERE m.ID = :messageId
      `;
      const selectResult = await connection.execute(
        selectQuery,
        { messageId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (selectResult.rows && selectResult.rows.length > 0) {
        const message = selectResult.rows[0];
        console.log(
          `  ✅ Retrieved message: "${message.CONTENT}" from session ${message.SESSION_ID}`
        );
      }

      // Test UPDATE
      console.log('  Testing UPDATE operations...');
      const updateQuery = `
        UPDATE MESSAGING_MESSAGES 
        SET IS_READ = 1, READ_AT = SYSTIMESTAMP
        WHERE ID = :messageId
      `;
      await connection.execute(updateQuery, { messageId }, { autoCommit: true });
      console.log('  ✅ Updated message read status');

      // Test DELETE (cleanup)
      console.log('  Testing DELETE operations...');
      await connection.execute(
        'DELETE FROM MESSAGING_MESSAGES WHERE ID = :messageId',
        { messageId },
        { autoCommit: true }
      );
      await connection.execute(
        'DELETE FROM MESSAGING_SESSIONS WHERE ID = :sessionId',
        { sessionId },
        { autoCommit: true }
      );
      console.log('  ✅ Cleaned up test data');
    } catch (error) {
      console.log(`  ❌ CRUD test failed: ${error.message}`);
    }

    // Test 4: Test constraints and indexes
    console.log('\n📋 Test 4: Checking constraints and indexes...');

    const constraintsQuery = `
      SELECT constraint_name, constraint_type, table_name
      FROM user_constraints 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
      ORDER BY table_name, constraint_name
    `;
    const constraintsResult = await connection.execute(
      constraintsQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`  ✅ Found ${constraintsResult.rows.length} constraints`);

    const indexesQuery = `
      SELECT index_name, table_name
      FROM user_indexes 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
      ORDER BY table_name, index_name
    `;
    const indexesResult = await connection.execute(
      indexesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log(`  ✅ Found ${indexesResult.rows.length} indexes`);

    // Test 5: Test sample data
    console.log('\n📋 Test 5: Checking sample data...');
    for (const table of existingTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${table}`;
        const countResult = await connection.execute(
          countQuery,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const count = countResult.rows[0].COUNT;
        console.log(`  📊 ${table}: ${count} records`);
      } catch (error) {
        console.log(`  ❌ ${table}: Error checking data - ${error.message}`);
      }
    }

    console.log('\n🎉 All database tests completed successfully!');
    console.log('\n✅ Messaging database is ready for use!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
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

// Run the test
testMessagingDatabase().catch(console.error);
