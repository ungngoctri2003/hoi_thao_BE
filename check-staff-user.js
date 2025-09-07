const oracledb = require('oracledb');

async function checkStaffUser() {
  try {
    const connection = await oracledb.getConnection({
      user: 'C##HOI_THAO',
      password: 'hoithao123',
      connectString: 'localhost:1521/XE'
    });
    
    // Check staff user details
    const staffResult = await connection.execute(`
      SELECT ID, EMAIL, NAME, PASSWORD_HASH, ROLE_CODE, CREATED_AT, UPDATED_AT
      FROM APP_USERS 
      WHERE EMAIL = 'staff@conference.vn'
    `);
    
    console.log('Staff user details:');
    if (staffResult.rows.length > 0) {
      const staff = staffResult.rows[0];
      console.log(`ID: ${staff[0]}`);
      console.log(`Email: ${staff[1]}`);
      console.log(`Name: ${staff[2]}`);
      console.log(`Password Hash: ${staff[3] || 'NULL'}`);
      console.log(`Role: ${staff[4] || 'NULL'}`);
      console.log(`Created: ${staff[5]}`);
      console.log(`Updated: ${staff[6]}`);
    } else {
      console.log('Staff user not found');
    }
    
    // Check all users with their roles
    console.log('\nAll users with roles:');
    const allUsersResult = await connection.execute(`
      SELECT ID, EMAIL, NAME, ROLE_CODE, PASSWORD_HASH
      FROM APP_USERS 
      ORDER BY ID
    `);
    
    allUsersResult.rows.forEach(user => {
      console.log(`ID: ${user[0]}, Email: ${user[1]}, Name: ${user[2]}, Role: ${user[3] || 'NULL'}, Password: ${user[4] ? 'SET' : 'NULL'}`);
    });
    
    await connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStaffUser();
