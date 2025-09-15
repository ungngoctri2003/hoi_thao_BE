const { roomsRepository } = require('./dist/modules/venue/rooms.repository.js');

async function testRoomsRepository() {
  try {
    console.log('Testing rooms repository directly...');

    const rooms = await roomsRepository.listAll();
    console.log(`Found ${rooms.length} rooms`);

    // Show first 3 rooms with their features
    rooms.slice(0, 3).forEach((room, index) => {
      console.log(`\nRoom ${index + 1}:`);
      console.log(`  ID: ${room.ID}`);
      console.log(`  Name: ${room.NAME}`);
      console.log(`  Capacity: ${room.CAPACITY}`);
      console.log(`  Features: ${JSON.stringify(room.FEATURES, null, 2)}`);
    });

    // Test getById for a specific room
    if (rooms.length > 0) {
      const firstRoomId = rooms[0].ID;
      console.log(`\nTesting getById for room ${firstRoomId}...`);

      const room = await roomsRepository.getById(firstRoomId);
      if (room) {
        console.log(`Room by ID ${firstRoomId}:`);
        console.log(`  Name: ${room.NAME}`);
        console.log(`  Features: ${JSON.stringify(room.FEATURES, null, 2)}`);
      }
    }
  } catch (error) {
    console.error('Error testing repository:', error);
  }
}

testRoomsRepository();
