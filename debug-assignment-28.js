const { userConferenceAssignmentsRepository } = require('./dist/modules/user-conference-assignments/user-conference-assignments.repository');

async function debugAssignment28() {
  try {
    console.log('=== Debug Assignment for User 28 ===\n');

    // Check if user 28 already has assignment for conference 1
    console.log('1. Checking existing assignments for user 28...');
    const existingAssignments = await userConferenceAssignmentsRepository.findByUserId(28);
    console.log(`Found ${existingAssignments.length} existing assignments`);

    // Try to create assignment
    console.log('\n2. Creating assignment for user 28...');
    try {
      const assignmentId = await userConferenceAssignmentsRepository.create({
        userId: 28,
        conferenceId: 1,
        permissions: {
          'conferences.view': true,
          'conferences.update': true,
          'attendees.manage': true
        },
        assignedBy: 1
      });
      console.log(`✅ Assignment created successfully with ID: ${assignmentId}`);

      // Check if it was actually saved
      console.log('\n3. Verifying assignment was saved...');
      const verifyAssignments = await userConferenceAssignmentsRepository.findByUserId(28);
      console.log(`Found ${verifyAssignments.length} assignments after creation`);

      if (verifyAssignments.length > 0) {
        console.log('Assignment details:', verifyAssignments[0]);
      }

    } catch (error) {
      console.log(`❌ Error creating assignment:`, error.message);
      
      // Check if it's a unique constraint violation
      if (error.message.includes('unique constraint')) {
        console.log('This is a unique constraint violation - user 28 might already have an assignment for conference 1');
        
        // Check all assignments for user 28
        const allAssignments = await userConferenceAssignmentsRepository.listAll();
        const user28Assignments = allAssignments.data.filter(a => a.userId === 28);
        console.log(`User 28 has ${user28Assignments.length} assignments:`, user28Assignments);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugAssignment28();
