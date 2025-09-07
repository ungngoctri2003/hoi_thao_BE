const { withConn } = require('./dist/config/db');
const { userConferenceAssignmentsRepository } = require('./dist/modules/user-conference-assignments/user-conference-assignments.repository');
const { usersRepository } = require('./dist/modules/users/users.repository');
const { conferencesRepository } = require('./dist/modules/conferences/conferences.repository');

async function testConferenceAssignments() {
  try {
    console.log('=== Testing Conference Assignments ===\n');

    // 1. Check if we have staff users
    console.log('1. Checking staff users...');
    const staffUsers = await withConn(async (conn) => {
      const result = await conn.execute(`
        SELECT u.ID, u.NAME, u.EMAIL, r.CODE as role_code
        FROM APP_USERS u
        JOIN USER_ROLES ur ON u.ID = ur.USER_ID
        JOIN ROLES r ON ur.ROLE_ID = r.ID
        WHERE r.CODE = 'staff'
      `, {}, { outFormat: require('oracledb').OUT_FORMAT_OBJECT });
      return result.rows || [];
    });
    
    console.log(`Found ${staffUsers.length} staff users:`, staffUsers.map(u => ({ id: u.ID, name: u.NAME, email: u.EMAIL })));

    // 2. Check if we have conferences
    console.log('\n2. Checking conferences...');
    const conferences = await withConn(async (conn) => {
      const result = await conn.execute('SELECT ID, NAME, STATUS FROM conferences WHERE ROWNUM <= 5', {}, { outFormat: require('oracledb').OUT_FORMAT_OBJECT });
      return result.rows || [];
    });
    
    console.log(`Found ${conferences.length} conferences:`, conferences.map(c => ({ id: c.ID, name: c.NAME, status: c.STATUS })));

    // 3. Check existing assignments
    console.log('\n3. Checking existing assignments...');
    const assignments = await userConferenceAssignmentsRepository.listAll();
    console.log(`Found ${assignments.data.length} existing assignments`);

    // 4. Test creating a new assignment (if we have staff and conferences)
    if (staffUsers.length > 0 && conferences.length > 0) {
      console.log('\n4. Testing assignment creation...');
      
      const staffUser = staffUsers[0];
      const conference = conferences[0];
      
      console.log(`Creating assignment for user ${staffUser.NAME} (ID: ${staffUser.ID}) to conference ${conference.NAME} (ID: ${conference.ID})`);
      
      try {
        const assignmentId = await userConferenceAssignmentsRepository.create({
          userId: staffUser.ID,
          conferenceId: conference.ID,
          permissions: {
            'conferences.view': true,
            'conferences.update': true,
            'attendees.manage': true
          },
          assignedBy: 1 // Assuming admin user ID is 1
        });
        
        console.log(`✅ Assignment created successfully with ID: ${assignmentId}`);
        
        // 5. Test retrieving assignments
        console.log('\n5. Testing assignment retrieval...');
        const userAssignments = await userConferenceAssignmentsRepository.findByUserId(staffUser.ID);
        console.log(`Found ${userAssignments.length} assignments for user ${staffUser.NAME}:`, userAssignments.map(a => ({
          id: a.id,
          conferenceId: a.conferenceId,
          conferenceName: a.conferenceName,
          permissions: a.permissions
        })));
        
      } catch (error) {
        console.log(`❌ Error creating assignment:`, error.message);
      }
    } else {
      console.log('\n4. Skipping assignment creation - need staff users and conferences');
    }

    console.log('\n=== Test completed ===');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConferenceAssignments();
