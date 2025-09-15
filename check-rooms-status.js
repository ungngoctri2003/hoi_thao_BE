const { roomsRepository } = require('./dist/modules/venue/rooms.repository.js');

async function checkRoomsStatus() {
  try {
    console.log('Checking rooms status from database...');
    const rooms = await roomsRepository.listAll();

    console.log(`\nFound ${rooms.length} rooms:`);
    rooms.forEach(room => {
      console.log(`ID: ${room.ID}, Name: ${room.NAME}, Status: ${room.STATUS}`);
    });

    // Check status distribution
    const statusCounts = {};
    rooms.forEach(room => {
      const status = room.STATUS || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('\nStatus distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count} rooms`);
    });
  } catch (error) {
    console.error('Error checking rooms status:', error);
  }
}

checkRoomsStatus();
