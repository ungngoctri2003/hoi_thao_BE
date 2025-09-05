const { withConn } = require('./dist/config/db');
const { userConferenceAssignmentsRepository } = require('./dist/modules/user-conference-assignments/user-conference-assignments.repository');

async function createAdminAssignments() {
  try {
    console.log('=== Creating Admin Assignments ===\n');

    // Get admin user ID
    const adminUser = await withConn(async (conn) => {
      const result = await conn.execute(
        'SELECT ID FROM APP_USERS WHERE EMAIL = :email',
        { email: 'admin@conference.vn' },
        { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
      );
      return result.rows?.[0];
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('Admin user ID:', adminUser.ID);

    // Get all conferences
    const conferences = await withConn(async (conn) => {
      const result = await conn.execute(
        'SELECT ID, NAME FROM conferences WHERE STATUS = :status',
        { status: 'active' },
        { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
      );
      return result.rows || [];
    });

    console.log('Found conferences:', conferences.map(c => ({ id: c.ID, name: c.NAME })));

    // Create assignments for admin user
    for (const conference of conferences) {
      try {
        const assignmentId = await userConferenceAssignmentsRepository.create({
          userId: adminUser.ID,
          conferenceId: conference.ID,
          permissions: {
            'conferences.view': true,
            'conferences.create': true,
            'conferences.update': true,
            'conferences.delete': true,
            'attendees.view': true,
            'attendees.manage': true,
            'checkin.manage': true,
            'networking.view': true,
            'venue.view': true,
            'sessions.view': true,
            'badges.view': true,
            'analytics.view': true,
            'my-events.view': true,
            'roles.manage': true,
            'mobile.view': true
          },
          assignedBy: adminUser.ID
        });

        console.log(`✅ Created assignment for conference ${conference.NAME} (ID: ${assignmentId})`);
      } catch (error) {
        console.log(`❌ Error creating assignment for conference ${conference.NAME}:`, error.message);
      }
    }

    // Verify assignments
    console.log('\n=== Verifying Assignments ===');
    const assignments = await userConferenceAssignmentsRepository.findByUserId(adminUser.ID);
    console.log(`Found ${assignments.length} assignments for admin user:`);
    assignments.forEach(a => {
      console.log(`- Conference ${a.conferenceId}: ${a.conferenceName} (Active: ${a.isActive})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

createAdminAssignments();
