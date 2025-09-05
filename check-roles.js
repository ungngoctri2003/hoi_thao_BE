const oracledb = require('oracledb');
const { withConn } = require('./src/config/db');

async function checkRoles() {
  try {
    console.log('🔌 Connecting to database...');
    
    await withConn(async (conn) => {
      console.log('✅ Connected to database');
      
      // Check roles table
      console.log('\n📋 Checking ROLES table...');
      const rolesRes = await conn.execute('SELECT * FROM ROLES ORDER BY ID');
      console.log('Roles found:', rolesRes.rows.length);
      rolesRes.rows.forEach(role => {
        console.log(`- ID: ${role.ID}, CODE: ${role.CODE}, NAME: ${role.NAME}`);
      });
      
      // Check user roles
      console.log('\n👥 Checking USER_ROLES table...');
      const userRolesRes = await conn.execute('SELECT * FROM USER_ROLES ORDER BY USER_ID');
      console.log('User roles found:', userRolesRes.rows.length);
      userRolesRes.rows.forEach(userRole => {
        console.log(`- USER_ID: ${userRole.USER_ID}, ROLE_ID: ${userRole.ROLE_ID}`);
      });
      
      // Check specific user role
      console.log('\n🔍 Checking user role for user ID 1...');
      const userRoleRes = await conn.execute(
        `SELECT r.CODE as role_code 
         FROM USER_ROLES ur 
         JOIN ROLES r ON ur.ROLE_ID = r.ID 
         WHERE ur.USER_ID = :userId AND ROWNUM = 1`,
        { userId: 1 }
      );
      console.log('User 1 role:', userRoleRes.rows[0] || 'No role found');
      
    });
    
    console.log('\n🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRoles();
