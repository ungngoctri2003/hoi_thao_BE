const { roomsRepository } = require('./dist/modules/venue/rooms.repository.js');

async function testRoomsWithStatus() {
  try {
    console.log('Testing rooms with STATUS from database...');

    const rooms = await roomsRepository.listAll();
    console.log(`Found ${rooms.length} rooms`);

    // Show first 3 rooms with their status
    rooms.slice(0, 3).forEach((room, index) => {
      console.log(`\nRoom ${index + 1}:`);
      console.log(`  ID: ${room.ID}`);
      console.log(`  Name: ${room.NAME}`);
      console.log(`  Status: ${room.STATUS}`);
      console.log(`  Features: ${JSON.stringify(room.FEATURES, null, 2)}`);
    });

    // Test updating a room's status
    if (rooms.length > 0) {
      const firstRoomId = rooms[0].ID;
      console.log(`\nTesting status update for room ${firstRoomId}...`);

      // Update status to maintenance
      await roomsRepository.update(
        firstRoomId,
        rooms[0].NAME,
        rooms[0].CAPACITY,
        rooms[0].DESCRIPTION,
        rooms[0].ROOM_TYPE,
        rooms[0].FEATURES,
        'maintenance'
      );
      console.log('Updated room status to maintenance');

      // Get updated room
      const updatedRoom = await roomsRepository.getById(firstRoomId);
      console.log(`Updated room status: ${updatedRoom.STATUS}`);

      // Update back to available
      await roomsRepository.update(
        firstRoomId,
        rooms[0].NAME,
        rooms[0].CAPACITY,
        rooms[0].DESCRIPTION,
        rooms[0].ROOM_TYPE,
        rooms[0].FEATURES,
        'available'
      );
      console.log('Updated room status back to available');
    }
  } catch (error) {
    console.error('Error testing rooms with status:', error);
  }
}

testRoomsWithStatus();
