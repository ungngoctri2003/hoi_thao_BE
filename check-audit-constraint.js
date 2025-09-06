const oracledb = require('oracledb');

async function checkConstraint() {
  try {
    const connection = await oracledb.getConnection({
      user: 'C##HOI_THAO',
      password: 'hoithao123',
      connectString: 'localhost:1521/XE'
    });
    
    const result = await connection.execute(`
      SELECT constraint_name, search_condition 
      FROM user_constraints 
      WHERE table_name = 'AUDIT_LOGS' AND constraint_type = 'C'
    `);
    
    console.log('Constraints:');
    result.rows.forEach(row => {
      console.log(`Name: ${row[0]}, Condition: ${row[1]}`);
    });
    
    await connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkConstraint();
