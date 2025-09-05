const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking user conference assignments...');
    const assignments = await prisma.userConferenceAssignment.findMany({
      include: {
        user: true,
        conference: true
      },
      take: 5
    });
    console.log('Found assignments:', assignments.length);
    if(assignments[0]) {
      console.log('Sample assignment:', JSON.stringify(assignments[0], null, 2));
    }
    
    console.log('\nChecking conferences...');
    const conferences = await prisma.conference.findMany({ take: 5 });
    console.log('Found conferences:', conferences.length);
    if(conferences[0]) {
      console.log('Sample conference:', JSON.stringify(conferences[0], null, 2));
    }
    
    console.log('\nChecking users...');
    const users = await prisma.user.findMany({ take: 5 });
    console.log('Found users:', users.length);
    if(users[0]) {
      console.log('Sample user:', JSON.stringify(users[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();


