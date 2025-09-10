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

async function checkDatabaseTables() {
  let connection;

  try {
    console.log('🔌 Connecting to Oracle database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    console.log('\n🔍 Checking existing tables and objects...\n');

    // Check for all tables
    console.log('📋 ALL TABLES:');
    const allTablesQuery = `
      SELECT table_name, 
             CASE 
               WHEN table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS') 
               THEN 'MESSAGING' 
               ELSE 'OTHER' 
             END as category
      FROM user_tables 
      ORDER BY table_name
    `;

    const allTablesResult = await connection.execute(
      allTablesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const allTables = allTablesResult.rows || [];

    allTables.forEach(table => {
      const icon = table.CATEGORY === 'MESSAGING' ? '✅' : '📄';
      console.log(`${icon} ${table.TABLE_NAME} (${table.CATEGORY})`);
    });

    // Check for messaging tables specifically
    console.log('\n📋 MESSAGING TABLES:');
    const messagingTablesQuery = `
      SELECT table_name 
      FROM user_tables 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
      ORDER BY table_name
    `;

    const messagingTablesResult = await connection.execute(
      messagingTablesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const messagingTables = (messagingTablesResult.rows || []).map(row => row.TABLE_NAME);

    if (messagingTables.length === 0) {
      console.log('❌ No messaging tables found');
    } else {
      messagingTables.forEach(table => {
        console.log(`✅ ${table}`);
      });
    }

    // Check for indexes
    console.log('\n📋 MESSAGING INDEXES:');
    const indexesQuery = `
      SELECT index_name, table_name
      FROM user_indexes 
      WHERE index_name IN ('IDX_MS_USERS', 'IDX_MS_CONFERENCE', 'IDX_MM_SESSION', 
                          'IDX_MM_SENDER', 'IDX_MM_ATTENDEE', 'IDX_MM_CREATED_AT', 
                          'IDX_MU_USER', 'IDX_MU_CONFERENCE')
      ORDER BY index_name
    `;

    const indexesResult = await connection.execute(
      indexesQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const indexes = indexesResult.rows || [];

    if (indexes.length === 0) {
      console.log('❌ No messaging indexes found');
    } else {
      indexes.forEach(index => {
        console.log(`✅ ${index.INDEX_NAME} (on ${index.TABLE_NAME})`);
      });
    }

    // Check for constraints
    console.log('\n📋 MESSAGING CONSTRAINTS:');
    const constraintsQuery = `
      SELECT constraint_name, table_name, constraint_type
      FROM user_constraints 
      WHERE table_name IN ('MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS')
      ORDER BY table_name, constraint_name
    `;

    const constraintsResult = await connection.execute(
      constraintsQuery,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const constraints = constraintsResult.rows || [];

    if (constraints.length === 0) {
      console.log('❌ No messaging constraints found');
    } else {
      constraints.forEach(constraint => {
        console.log(
          `✅ ${constraint.CONSTRAINT_NAME} (${constraint.CONSTRAINT_TYPE}) on ${constraint.TABLE_NAME}`
        );
      });
    }

    // Check for sample data
    console.log('\n📋 SAMPLE DATA:');
    for (const table of messagingTables) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM ${table}`;
        const countResult = await connection.execute(
          countQuery,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const count = countResult.rows[0].COUNT;
        console.log(`📊 ${table}: ${count} records`);
      } catch (error) {
        console.log(`❌ ${table}: Error checking data - ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Total tables: ${allTables.length}`);
    console.log(`Messaging tables: ${messagingTables.length}/3`);
    console.log(`Messaging indexes: ${indexes.length}/8`);
    console.log(`Messaging constraints: ${constraints.length}`);

    const missingTables = ['MESSAGING_SESSIONS', 'MESSAGING_MESSAGES', 'MESSAGING_USERS'].filter(
      table => !messagingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.log(`\n❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('\n✅ All messaging tables exist!');
    }
  } catch (error) {
    console.error('❌ Database check failed:', error);
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

// Run the check
checkDatabaseTables().catch(console.error);
