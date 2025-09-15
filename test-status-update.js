const { roomsRepository } = require('./dist/modules/venue/rooms.repository.js');

async function testStatusUpdate() {
  try {
    console.log('Testing status update...');

    // Test creating a room with status
    console.log('Creating room with status...');
    const roomId = await roomsRepository.create(
      1, // floorId
      'Test Room with Status',
      50,
      'Test description',
      'meeting',
      ['WiFi', 'Projector'],
      'maintenance'
    );
    console.log('Created room ID:', roomId);

    // Test updating room status
    console.log('Updating room status...');
    await roomsRepository.update(
      roomId,
      'Test Room with Status',
      50,
      'Test description',
      'meeting',
      ['WiFi', 'Projector'],
      'available'
    );
    console.log('Updated room status to available');

    // Test getting room by ID
    console.log('Getting room by ID...');
    const room = await roomsRepository.getById(roomId);
    console.log('Room details:', JSON.stringify(room, null, 2));

    // Test listing all rooms
    console.log('Listing all rooms...');
    const rooms = await roomsRepository.listAll();
    console.log('Total rooms:', rooms.length);
    console.log('First room status:', rooms[0]?.STATUS);
  } catch (error) {
    console.error('Error testing status update:', error);
  }
}

testStatusUpdate();
