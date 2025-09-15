const fetch = require('node-fetch');

async function testRoomsAPIWithAuth() {
  try {
    console.log('Testing rooms API with authentication...');

    // First, let's get a token by logging in
    const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com', // Use a valid admin email
        password: 'admin123', // Use a valid password
      }),
    });

    if (!loginResponse.ok) {
      console.log('Login failed, trying with different credentials...');
      // Try with different credentials
      const loginResponse2 = await fetch('http://localhost:4000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      if (!loginResponse2.ok) {
        console.log('Both login attempts failed. Please check credentials.');
        return;
      }

      const loginData2 = await loginResponse2.json();
      const token = loginData2.token;

      // Test rooms API with token
      const roomsResponse = await fetch('http://localhost:4000/api/v1/venue/rooms', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const roomsData = await roomsResponse.json();
      console.log('Rooms API response with auth:');
      console.log(JSON.stringify(roomsData, null, 2));

      // Check if features are present
      if (roomsData.data && roomsData.data.length > 0) {
        console.log('\nFirst room features:');
        console.log(JSON.stringify(roomsData.data[0].FEATURES, null, 2));
      }
    } else {
      const loginData = await loginResponse.json();
      const token = loginData.token;

      // Test rooms API with token
      const roomsResponse = await fetch('http://localhost:4000/api/v1/venue/rooms', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const roomsData = await roomsResponse.json();
      console.log('Rooms API response with auth:');
      console.log(JSON.stringify(roomsData, null, 2));

      // Check if features are present
      if (roomsData.data && roomsData.data.length > 0) {
        console.log('\nFirst room features:');
        console.log(JSON.stringify(roomsData.data[0].FEATURES, null, 2));
      }
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testRoomsAPIWithAuth();
