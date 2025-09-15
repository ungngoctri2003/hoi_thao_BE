const fetch = require('node-fetch');

async function testRoomsAPI() {
  try {
    console.log('Testing rooms API...');

    // Test without auth first to see if server is running
    const response = await fetch('http://localhost:4000/api/v1/venue/test');
    const testResult = await response.text();
    console.log('Test endpoint response:', testResult);

    // Test rooms endpoint (this will fail without auth, but we can see the structure)
    try {
      const roomsResponse = await fetch('http://localhost:4000/api/v1/venue/rooms');
      const roomsData = await roomsResponse.json();
      console.log('Rooms API response:', JSON.stringify(roomsData, null, 2));
    } catch (error) {
      console.log('Rooms API error (expected without auth):', error.message);
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testRoomsAPI();
