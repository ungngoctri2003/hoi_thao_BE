const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'system',
  password: process.env.DB_PASSWORD || 'oracle',
  connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE',
  privilege: oracledb.SYSDBA
};

async function testUniqueConstraintFix() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Oracle Database...');
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to Oracle Database');

    // Test 1: Check if table exists and has the unique constraint
    console.log('\n📋 Test 1: Checking table structure...');
    const constraintQuery = `
      SELECT constraint_name, constraint_type, search_condition
      FROM user_constraints 
      WHERE table_name = 'USER_CONFERENCE_ASSIGNMENTS' 
      AND constraint_type = 'U'
    `;
    
    const constraintResult = await connection.execute(constraintQuery);
    console.log('Unique constraints:');
    console.table(constraintResult.rows);

    // Test 2: Check existing data
    console.log('\n📊 Test 2: Checking existing data...');
    const dataQuery = `
      SELECT user_id, conference_id, COUNT(*) as count
      FROM user_conference_assignments 
      GROUP BY user_id, conference_id
      HAVING COUNT(*) > 1
    `;
    
    const duplicateResult = await connection.execute(dataQuery);
    if (duplicateResult.rows.length > 0) {
      console.log('⚠️  Found duplicate assignments:');
      console.table(duplicateResult.rows);
    } else {
      console.log('✅ No duplicate assignments found');
    }

    // Test 3: Test the upsert functionality
    console.log('\n🧪 Test 3: Testing upsert functionality...');
    
    // First, let's see what users and conferences exist
    const usersQuery = 'SELECT id, name, email FROM app_users WHERE ROWNUM <= 3';
    const conferencesQuery = 'SELECT id, name FROM conferences WHERE ROWNUM <= 3';
    
    const users = await connection.execute(usersQuery);
    const conferences = await connection.execute(conferencesQuery);
    
    console.log('Available users:');
    console.table(users.rows);
    console.log('Available conferences:');
    console.table(conferences.rows);

    if (users.rows.length > 0 && conferences.rows.length > 0) {
      const testUserId = users.rows[0].ID;
      const testConferenceId = conferences.rows[0].ID;
      
      console.log(`\n🔄 Testing upsert with user ${testUserId} and conference ${testConferenceId}...`);
      
      // Test the MERGE statement directly
      const mergeQuery = `
        MERGE INTO user_conference_assignments uca
        USING (SELECT :userId as user_id, :conferenceId as conference_id FROM dual) src
        ON (uca.user_id = src.user_id AND uca.conference_id = src.conference_id)
        WHEN MATCHED THEN
          UPDATE SET 
            permissions = :permissions,
            assigned_by = :assignedBy,
            is_active = 1,
            updated_at = CURRENT_TIMESTAMP
        WHEN NOT MATCHED THEN
          INSERT (user_id, conference_id, permissions, assigned_by, is_active)
          VALUES (:userId, :conferenceId, :permissions, :assignedBy, 1)
      `;
      
      const testPermissions = JSON.stringify({
        "conferences.view": true,
        "conferences.update": true,
        "attendees.manage": true
      });
      
      try {
        // First insert
        console.log('📝 First insert...');
        await connection.execute(mergeQuery, {
          userId: testUserId,
          conferenceId: testConferenceId,
          permissions: testPermissions,
          assignedBy: testUserId
        }, { autoCommit: true });
        console.log('✅ First insert successful');
        
        // Second insert (should update, not create duplicate)
        console.log('📝 Second insert (should update)...');
        await connection.execute(mergeQuery, {
          userId: testUserId,
          conferenceId: testConferenceId,
          permissions: JSON.stringify({
            "conferences.view": true,
            "conferences.update": false,
            "attendees.manage": true
          }),
          assignedBy: testUserId
        }, { autoCommit: true });
        console.log('✅ Second insert (update) successful');
        
        // Verify the result
        const verifyQuery = `
          SELECT user_id, conference_id, permissions, is_active, updated_at
          FROM user_conference_assignments 
          WHERE user_id = :userId AND conference_id = :conferenceId
        `;
        
        const verifyResult = await connection.execute(verifyQuery, {
          userId: testUserId,
          conferenceId: testConferenceId
        });
        
        console.log('📋 Final result:');
        console.table(verifyResult.rows);
        
      } catch (error) {
        console.error('❌ Upsert test failed:', error.message);
      }
    }

    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
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

// Run the test
testUniqueConstraintFix().catch(console.error);
