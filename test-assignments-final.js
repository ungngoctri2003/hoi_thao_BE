const { userConferenceAssignmentsRepository } = require('./dist/modules/user-conference-assignments/user-conference-assignments.repository');

async function testFinal() {
  try {
    console.log('=== Final Test ===\n');

    // Test findByUserId
    console.log('1. Testing findByUserId...');
    const assignments = await userConferenceAssignmentsRepository.findByUserId(5);
    console.log(`Found ${assignments.length} assignments for user 5:`);
    
    assignments.forEach((assignment, index) => {
      console.log(`  Assignment ${index + 1}:`);
      console.log(`    ID: ${assignment.id}`);
      console.log(`    User ID: ${assignment.userId}`);
      console.log(`    Conference ID: ${assignment.conferenceId}`);
      console.log(`    Conference Name: ${assignment.conferenceName}`);
      console.log(`    Permissions: ${assignment.permissions}`);
      console.log(`    Is Active: ${assignment.isActive}`);
      console.log(`    Assigned At: ${assignment.assignedAt}`);
      console.log('');
    });

    // Test listAll
    console.log('2. Testing listAll...');
    const allAssignments = await userConferenceAssignmentsRepository.listAll();
    console.log(`Found ${allAssignments.data.length} total assignments in system`);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinal();
