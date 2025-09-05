const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
};

async function setupPermissions() {
  let conn;
  try {
    console.log('🔌 Connecting to database...');
    conn = await oracledb.getConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if permissions table exists and has data
    console.log('📋 Checking permissions table...');
    const permCheck = await conn.execute(
      `SELECT COUNT(*) as count FROM PERMISSIONS`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const permCount = permCheck.rows[0].COUNT;
    console.log(`📊 Found ${permCount} permissions in database`);

    // Check if roles table exists and has data
    console.log('👥 Checking roles table...');
    const roleCheck = await conn.execute(
      `SELECT COUNT(*) as count FROM ROLES`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const roleCount = roleCheck.rows[0].COUNT;
    console.log(`📊 Found ${roleCount} roles in database`);

    // Always update permissions to match frontend format
    console.log('🔧 Updating permissions to match frontend format...');
    
    // First, clear existing permissions
    await conn.execute(`DELETE FROM ROLE_PERMISSIONS`, {}, { autoCommit: true });
    await conn.execute(`DELETE FROM PERMISSIONS`, {}, { autoCommit: true });
    console.log('🗑️ Cleared existing permissions');

    const permissions = [
      { code: 'dashboard.view', name: 'Xem Dashboard', category: 'Dashboard', description: 'Truy cập trang tổng quan' },
      { code: 'profile.view', name: 'Xem Profile', category: 'Profile', description: 'Xem thông tin cá nhân' },
      { code: 'conferences.view', name: 'Xem Hội nghị', category: 'Conferences', description: 'Xem danh sách hội nghị' },
      { code: 'conferences.create', name: 'Tạo Hội nghị', category: 'Conferences', description: 'Tạo hội nghị mới' },
      { code: 'conferences.update', name: 'Cập nhật Hội nghị', category: 'Conferences', description: 'Cập nhật thông tin hội nghị' },
      { code: 'conferences.delete', name: 'Xóa Hội nghị', category: 'Conferences', description: 'Xóa hội nghị' },
      { code: 'attendees.view', name: 'Xem Người tham dự', category: 'Attendees', description: 'Xem danh sách người tham dự' },
      { code: 'attendees.read', name: 'Đọc Người tham dự', category: 'Attendees', description: 'Đọc thông tin người tham dự' },
      { code: 'attendees.write', name: 'Ghi Người tham dự', category: 'Attendees', description: 'Ghi thông tin người tham dự' },
      { code: 'attendees.manage', name: 'Quản lý Người tham dự', category: 'Attendees', description: 'Quản lý người tham dự' },
      { code: 'checkin.manage', name: 'Quản lý Check-in', category: 'Check-in', description: 'Quản lý check-in' },
      { code: 'roles.manage', name: 'Quản lý Phân quyền', category: 'Roles', description: 'Quản lý phân quyền' },
      { code: 'audit.view', name: 'Xem Nhật ký', category: 'Audit', description: 'Xem nhật ký hệ thống' },
      { code: 'settings.manage', name: 'Quản lý Cài đặt', category: 'Settings', description: 'Quản lý cài đặt' },
      { code: 'analytics.view', name: 'Xem Phân tích', category: 'Analytics', description: 'Xem báo cáo phân tích' },
      { code: 'networking.view', name: 'Xem Kết nối mạng', category: 'Networking', description: 'Xem kết nối mạng' },
      { code: 'venue.view', name: 'Xem Bản đồ', category: 'Venue', description: 'Xem bản đồ địa điểm' },
      { code: 'sessions.view', name: 'Xem Phiên trực tiếp', category: 'Sessions', description: 'Xem phiên trực tiếp' },
      { code: 'badges.view', name: 'Xem Huy hiệu', category: 'Badges', description: 'Xem huy hiệu' },
      { code: 'mobile.view', name: 'Xem Ứng dụng di động', category: 'Mobile', description: 'Xem ứng dụng di động' },
      { code: 'my-events.view', name: 'Xem Sự kiện của tôi', category: 'Events', description: 'Xem sự kiện của tôi' },
    ];

    for (const perm of permissions) {
      await conn.execute(
        `INSERT INTO PERMISSIONS (CODE, NAME, CATEGORY, DESCRIPTION) VALUES (:code, :name, :category, :description)`,
        perm,
        { autoCommit: true }
      );
      console.log(`✅ Created permission: ${perm.name}`);
    }

    // If no roles, create them
    if (roleCount === 0) {
      console.log('🔧 Creating roles...');
      const roles = [
        { code: 'admin', name: 'Quản trị viên' },
        { code: 'staff', name: 'Nhân viên' },
        { code: 'attendee', name: 'Tham dự' },
      ];

      for (const role of roles) {
        await conn.execute(
          `INSERT INTO ROLES (CODE, NAME) VALUES (:code, :name)`,
          role,
          { autoCommit: true }
        );
        console.log(`✅ Created role: ${role.name}`);
      }
    }

    // Get role IDs
    const roleResult = await conn.execute(
      `SELECT ID, CODE FROM ROLES`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const roles = roleResult.rows;
    console.log('📋 Available roles:', roles);

    // Get permission IDs
    const permResult = await conn.execute(
      `SELECT ID, CODE FROM PERMISSIONS`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const allPermissions = permResult.rows;
    console.log('📋 Available permissions:', allPermissions);

    // Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');
    
    // Admin gets all permissions
    const adminRole = roles.find(r => r.CODE === 'admin');
    if (adminRole) {
      for (const perm of allPermissions) {
        try {
          await conn.execute(
            `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) VALUES (:roleId, :permId)`,
            { roleId: adminRole.ID, permId: perm.ID },
            { autoCommit: true }
          );
        } catch (error) {
          // Ignore duplicate key errors
          if (!error.message.includes('unique constraint')) {
            console.warn(`⚠️ Error assigning permission ${perm.CODE} to admin:`, error.message);
          }
        }
      }
      console.log(`✅ Assigned all permissions to admin role`);
    }

    // Staff gets limited permissions
    const staffRole = roles.find(r => r.CODE === 'staff');
    if (staffRole) {
      const staffPermissions = [
        'dashboard.view', 'profile.view', 'conferences.view', 'conferences.create', 'conferences.update',
        'attendees.view', 'attendees.read', 'attendees.write', 'attendees.manage',
        'checkin.manage', 'networking.view', 'venue.view', 'sessions.view', 'badges.view', 'mobile.view'
      ];
      
      for (const permCode of staffPermissions) {
        const perm = allPermissions.find(p => p.CODE === permCode);
        if (perm) {
          try {
            await conn.execute(
              `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) VALUES (:roleId, :permId)`,
              { roleId: staffRole.ID, permId: perm.ID },
              { autoCommit: true }
            );
          } catch (error) {
            if (!error.message.includes('unique constraint')) {
              console.warn(`⚠️ Error assigning permission ${permCode} to staff:`, error.message);
            }
          }
        }
      }
      console.log(`✅ Assigned staff permissions`);
    }

    // Attendee gets basic permissions
    const attendeeRole = roles.find(r => r.CODE === 'attendee');
    if (attendeeRole) {
      const attendeePermissions = [
        'dashboard.view', 'profile.view', 'networking.view', 'venue.view', 
        'sessions.view', 'badges.view', 'mobile.view', 'my-events.view'
      ];
      
      for (const permCode of attendeePermissions) {
        const perm = allPermissions.find(p => p.CODE === permCode);
        if (perm) {
          try {
            await conn.execute(
              `INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID) VALUES (:roleId, :permId)`,
              { roleId: attendeeRole.ID, permId: perm.ID },
              { autoCommit: true }
            );
          } catch (error) {
            if (!error.message.includes('unique constraint')) {
              console.warn(`⚠️ Error assigning permission ${permCode} to attendee:`, error.message);
            }
          }
        }
      }
      console.log(`✅ Assigned attendee permissions`);
    }

    // Check final state
    console.log('📊 Final state:');
    const finalRoleCheck = await conn.execute(
      `SELECT COUNT(*) as count FROM ROLES`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const finalPermCheck = await conn.execute(
      `SELECT COUNT(*) as count FROM PERMISSIONS`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const finalRolePermCheck = await conn.execute(
      `SELECT COUNT(*) as count FROM ROLE_PERMISSIONS`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(`✅ Roles: ${finalRoleCheck.rows[0].COUNT}`);
    console.log(`✅ Permissions: ${finalPermCheck.rows[0].COUNT}`);
    console.log(`✅ Role-Permission assignments: ${finalRolePermCheck.rows[0].COUNT}`);

    console.log('🎉 Permission setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up permissions:', error);
  } finally {
    if (conn) {
      try {
        await conn.close();
        console.log('🔌 Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

setupPermissions();
