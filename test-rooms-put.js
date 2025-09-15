const axios = require('axios');

async function testRoomsPut() {
  try {
    console.log('Testing PUT /api/v1/venue/rooms/2...');

    const response = await axios.put(
      'http://localhost:4000/api/v1/venue/rooms/2',
      {
        name: 'Updated Room Name',
        capacity: 50,
        description: 'Updated room description',
        roomType: 'Conference',
        features: ['Projector', 'Whiteboard', 'WiFi'],
      },
      {
        headers: {
          Authorization: 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testRoomsPut();
