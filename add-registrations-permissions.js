const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function addRegistrationsPermissions() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Add registrations permissions
    console.log('\n📋 Adding registrations permissions...');
    
    const permissions = [
      {
        code: 'registrations.read',
        name: 'Đọc Đăng ký',
        category: 'Registrations',
        description: 'Đọc thông tin đăng ký'
      },
      {
        code: 'registrations.write',
        name: 'Ghi Đăng ký',
        category: 'Registrations',
        description: 'Ghi thông tin đăng ký'
      }
    ];

    for (const perm of permissions) {
      // Check if permission already exists
      const checkResult = await conn.execute(
        `SELECT ID FROM PERMISSIONS WHERE CODE = :code`,
        { code: perm.code },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (checkResult.rows.length === 0) {
        // Create permission
        await conn.execute(
          `INSERT INTO PERMISSIONS (CODE, NAME, CATEGORY, DESCRIPTION, CREATED_AT) 
           VALUES (:code, :name, :category, :description, SYSDATE)`,
          perm,
          { autoCommit: true }
        );
        console.log(`✅ Created permission: ${perm.code}`);
      } else {
        console.log(`⚠️  Permission already exists: ${perm.code}`);
      }
    }

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

    // Get registrations permissions IDs
    console.log('\n🔐 Getting registrations permissions...');
    const regReadResult = await conn.execute(
      `SELECT ID FROM PERMISSIONS WHERE CODE = 'registrations.read'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const regWriteResult = await conn.execute(
      `SELECT ID FROM PERMISSIONS WHERE CODE = 'registrations.write'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const regReadId = regReadResult.rows[0]?.ID;
    const regWriteId = regWriteResult.rows[0]?.ID;

    if (!regReadId || !regWriteId) {
      console.log('❌ Registrations permissions not found');
      return;
    }

    console.log(`✅ Registrations permissions IDs: ${regReadId}, ${regWriteId}`);

    // Add permissions to admin role
    console.log('\n🔗 Adding permissions to admin role...');
    
    const rolePermissions = [
      { roleId: adminRoleId, permissionId: regReadId },
      { roleId: adminRoleId, permissionId: regWriteId }
    ];

    for (const rp of rolePermissions) {
      // Check if role permission already exists
      const checkResult = await conn.execute(
        `SELECT ID FROM ROLE_PERMISSIONS WHERE ROLE_ID = :roleId AND PERMISSION_ID = :permissionId`,
        rp,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (checkResult.rows.length === 0) {
        await conn.execute(
          `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID, CREATED_AT) 
           VALUES (:roleId, :permissionId, SYSDATE)`,
          rp,
          { autoCommit: true }
        );
        console.log(`✅ Added permission ${rp.permissionId} to admin role`);
      } else {
        console.log(`⚠️  Permission ${rp.permissionId} already assigned to admin role`);
      }
    }

    console.log('\n✅ Registrations permissions added to admin role successfully!');

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

addRegistrationsPermissions().catch(console.error);
