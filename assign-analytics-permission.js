const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'c##conference_user',
  password: process.env.DB_PASSWORD || 'conference_password',
  connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/XEPDB1',
};

async function assignAnalyticsPermission() {
  let connection;

  try {
    // Connect to database
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to Oracle database');

    // First, check if analytics.view permission exists
    const checkPermission = await connection.execute(
      `SELECT COUNT(*) as CNT FROM PERMISSIONS WHERE CODE = 'analytics.view'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const permissionExists = Number(checkPermission.rows[0].CNT) > 0;

    if (!permissionExists) {
      console.log('📝 Creating analytics.view permission...');
      await connection.execute(
        `INSERT INTO PERMISSIONS (CODE, NAME, DESCRIPTION) VALUES ('analytics.view', 'View Analytics', 'Permission to view analytics and dashboard data')`,
        {},
        { autoCommit: true }
      );
      console.log('✅ Created analytics.view permission');
    } else {
      console.log('✅ analytics.view permission already exists');
    }

    // Get admin user ID
    const adminUser = await connection.execute(
      `SELECT ID FROM USERS WHERE EMAIL = 'admin@example.com'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!adminUser.rows || adminUser.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const adminId = adminUser.rows[0].ID;
    console.log(`✅ Found admin user with ID: ${adminId}`);

    // Get analytics.view permission ID
    const permission = await connection.execute(
      `SELECT ID FROM PERMISSIONS WHERE CODE = 'analytics.view'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const permissionId = permission.rows[0].ID;
    console.log(`✅ Found analytics.view permission with ID: ${permissionId}`);

    // Check if user already has this permission
    const existingPermission = await connection.execute(
      `SELECT COUNT(*) as CNT FROM USER_PERMISSIONS WHERE USER_ID = :userId AND PERMISSION_ID = :permissionId`,
      { userId: adminId, permissionId: permissionId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const hasPermission = Number(existingPermission.rows[0].CNT) > 0;

    if (!hasPermission) {
      console.log('📝 Assigning analytics.view permission to admin user...');
      await connection.execute(
        `INSERT INTO USER_PERMISSIONS (USER_ID, PERMISSION_ID) VALUES (:userId, :permissionId)`,
        { userId: adminId, permissionId: permissionId },
        { autoCommit: true }
      );
      console.log('✅ Assigned analytics.view permission to admin user');
    } else {
      console.log('✅ Admin user already has analytics.view permission');
    }

    // Also assign to admin role if it exists
    const adminRole = await connection.execute(
      `SELECT ID FROM ROLES WHERE CODE = 'admin'`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (adminRole.rows && adminRole.rows.length > 0) {
      const roleId = adminRole.rows[0].ID;
      console.log(`✅ Found admin role with ID: ${roleId}`);

      // Check if role already has this permission
      const rolePermission = await connection.execute(
        `SELECT COUNT(*) as CNT FROM ROLE_PERMISSIONS WHERE ROLE_ID = :roleId AND PERMISSION_ID = :permissionId`,
        { roleId: roleId, permissionId: permissionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const roleHasPermission = Number(rolePermission.rows[0].CNT) > 0;

      if (!roleHasPermission) {
        console.log('📝 Assigning analytics.view permission to admin role...');
        await connection.execute(
          `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) VALUES (:roleId, :permissionId)`,
          { roleId: roleId, permissionId: permissionId },
          { autoCommit: true }
        );
        console.log('✅ Assigned analytics.view permission to admin role');
      } else {
        console.log('✅ Admin role already has analytics.view permission');
      }
    }

    console.log('🎉 Permission assignment completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('✅ Database connection closed');
      } catch (error) {
        console.error('❌ Error closing connection:', error.message);
      }
    }
  }
}

// Run the script
assignAnalyticsPermission().catch(console.error);
