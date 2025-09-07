const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function fixRegistrationsPermission() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if registrations.write permission exists
    console.log('\n📋 Checking registrations.write permission...');
    const checkResult = await conn.execute(
      `SELECT ID FROM PERMISSIONS WHERE CODE = 'registrations.write'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    let permissionId;
    if (checkResult.rows.length === 0) {
      // Create the permission
      console.log('Creating registrations.write permission...');
      const createResult = await conn.execute(
        `INSERT INTO PERMISSIONS (CODE, NAME, CATEGORY, DESCRIPTION) 
         VALUES ('registrations.write', 'Ghi Đăng ký', 'Registrations', 'Ghi thông tin đăng ký')`,
        {},
        { autoCommit: true }
      );
      console.log('✅ Created registrations.write permission');
      
      // Get the permission ID
      const getIdResult = await conn.execute(
        `SELECT ID FROM PERMISSIONS WHERE CODE = 'registrations.write'`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      permissionId = getIdResult.rows[0].ID;
    } else {
      permissionId = checkResult.rows[0].ID;
      console.log('✅ registrations.write permission already exists');
    }

    console.log(`Permission ID: ${permissionId}`);

    // Get admin role ID
    console.log('\n🎭 Getting admin role...');
    const adminRoleResult = await conn.execute(
      `SELECT ID FROM ROLES WHERE CODE = 'admin'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (adminRoleResult.rows.length === 0) {
      console.log('❌ Admin role not found');
      return;
    }

    const adminRoleId = adminRoleResult.rows[0].ID;
    console.log(`✅ Admin role ID: ${adminRoleId}`);

    // Check if role permission already exists
    console.log('\n🔗 Checking role permission...');
    const rolePermCheck = await conn.execute(
      `SELECT * FROM ROLE_PERMISSIONS WHERE ROLE_ID = :roleId AND PERMISSION_ID = :permissionId`,
      { roleId: adminRoleId, permissionId: permissionId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (rolePermCheck.rows.length === 0) {
      // Add permission to admin role
      await conn.execute(
        `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) 
         VALUES (:roleId, :permissionId)`,
        { roleId: adminRoleId, permissionId: permissionId },
        { autoCommit: true }
      );
      console.log('✅ Added registrations.write permission to admin role');
    } else {
      console.log('⚠️  Permission already assigned to admin role');
    }

    console.log('\n✅ Fix completed successfully!');

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

fixRegistrationsPermission().catch(console.error);
