const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function updateRegistrationsConstraint() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Drop existing constraint
    console.log('\n🗑️ Dropping existing CK_REG_STATUS constraint...');
    try {
      await conn.execute(`ALTER TABLE REGISTRATIONS DROP CONSTRAINT CK_REG_STATUS`, {}, { autoCommit: true });
      console.log('✅ Dropped existing constraint');
    } catch (error) {
      if (error.message.includes('ORA-02443')) {
        console.log('⚠️  Constraint does not exist, continuing...');
      } else {
        throw error;
      }
    }

    // Add new constraint with checked-out
    console.log('\n➕ Adding new CK_REG_STATUS constraint with checked-out...');
    await conn.execute(
      `ALTER TABLE REGISTRATIONS ADD CONSTRAINT CK_REG_STATUS 
       CHECK (STATUS IN ('registered', 'checked-in', 'checked-out', 'cancelled', 'no-show'))`,
      {},
      { autoCommit: true }
    );
    console.log('✅ Added new constraint with checked-out status');

    // Verify constraint
    console.log('\n🔍 Verifying constraint...');
    const constraintResult = await conn.execute(
      `SELECT constraint_name, search_condition 
       FROM user_constraints 
       WHERE constraint_name = 'CK_REG_STATUS'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (constraintResult.rows.length > 0) {
      console.log('✅ Constraint verified:');
      console.log(`  Condition: ${constraintResult.rows[0].SEARCH_CONDITION}`);
    } else {
      console.log('❌ Constraint not found');
    }

    // Test the constraint
    console.log('\n🧪 Testing constraint with checked-out...');
    try {
      // This should work now
      await conn.execute(
        `UPDATE REGISTRATIONS SET STATUS = 'checked-out' WHERE ID = 23`,
        {},
        { autoCommit: true }
      );
      console.log('✅ Constraint test passed - checked-out is now allowed');
    } catch (error) {
      console.log('❌ Constraint test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('\n🔌 Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error.message);
      }
    }
  }
}

updateRegistrationsConstraint().catch(console.error);
