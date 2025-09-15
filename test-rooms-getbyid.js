const axios = require('axios');

async function testRoomsGetById() {
  try {
    console.log('Testing GET /api/v1/venue/rooms/2...');

    const response = await axios.get('http://localhost:4000/api/v1/venue/rooms/2', {
      headers: {
        Authorization: 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
      },
    });

    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testRoomsGetById();
