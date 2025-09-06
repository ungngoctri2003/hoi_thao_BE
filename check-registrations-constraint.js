const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function checkRegistrationsConstraint() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check table structure
    console.log('\n📋 Checking REGISTRATIONS table structure...');
    const tableResult = await conn.execute(
      `SELECT column_name, data_type, data_length, nullable 
       FROM user_tab_columns 
       WHERE table_name = 'REGISTRATIONS' 
       ORDER BY column_id`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('📊 REGISTRATIONS table columns:');
    tableResult.rows.forEach(row => {
      console.log(`  ${row.COLUMN_NAME}: ${row.DATA_TYPE}(${row.DATA_LENGTH}) ${row.NULLABLE === 'Y' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check constraints
    console.log('\n🔒 Checking constraints...');
    const constraintResult = await conn.execute(
      `SELECT constraint_name, constraint_type, search_condition 
       FROM user_constraints 
       WHERE table_name = 'REGISTRATIONS'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('📊 REGISTRATIONS constraints:');
    constraintResult.rows.forEach(row => {
      console.log(`  ${row.CONSTRAINT_NAME}: ${row.CONSTRAINT_TYPE}`);
      if (row.SEARCH_CONDITION) {
        console.log(`    Condition: ${row.SEARCH_CONDITION}`);
      }
    });

    // Check current data
    console.log('\n📊 Checking current registration data...');
    const dataResult = await conn.execute(
      `SELECT ID, STATUS, COUNT(*) as count 
       FROM REGISTRATIONS 
       GROUP BY ID, STATUS 
       ORDER BY ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('📊 Current registration statuses:');
    dataResult.rows.forEach(row => {
      console.log(`  ID ${row.ID}: ${row.STATUS} (${row.COUNT} records)`);
    });

    // Try to find the specific constraint
    console.log('\n🔍 Looking for CK_REG_STATUS constraint...');
    const ckConstraintResult = await conn.execute(
      `SELECT constraint_name, search_condition 
       FROM user_constraints 
       WHERE constraint_name = 'CK_REG_STATUS'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (ckConstraintResult.rows.length > 0) {
      console.log('✅ Found CK_REG_STATUS constraint:');
      console.log(`  Condition: ${ckConstraintResult.rows[0].SEARCH_CONDITION}`);
    } else {
      console.log('❌ CK_REG_STATUS constraint not found');
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

checkRegistrationsConstraint().catch(console.error);
