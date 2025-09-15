const { roomsRepository } = require('./dist/modules/venue/rooms.repository.js');

async function testRoomsDirect() {
  try {
    console.log('Testing rooms directly from database...');
    const rooms = await roomsRepository.listAll();

    console.log(`\nFound ${rooms.length} rooms:`);
    rooms.forEach(room => {
      console.log(`ID: ${room.ID}, Name: ${room.NAME}, STATUS: ${room.STATUS}`);
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

    // Test the mapping logic
    console.log('\nTesting mapping logic:');
    rooms.forEach(room => {
      const dbStatus = room.STATUS;
      let mappedStatus;

      if (dbStatus && ['available', 'occupied', 'maintenance', 'reserved'].includes(dbStatus)) {
        mappedStatus = dbStatus;
      } else {
        mappedStatus = 'available';
      }

      console.log(`Room ${room.NAME}: DB=${dbStatus} -> Mapped=${mappedStatus}`);
    });
  } catch (error) {
    console.error('Error testing rooms:', error);
  }
}

testRoomsDirect();
