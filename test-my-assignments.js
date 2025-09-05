const axios = require('axios');

async function testMyAssignments() {
  try {
    console.log('=== Testing /my-assignments API ===\n');

    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });

    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...');

    // Test /my-assignments endpoint
    console.log('\n2. Testing /my-assignments endpoint...');
    const assignmentsResponse = await axios.get('http://localhost:4000/api/v1/user-conference-assignments/my-assignments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ My assignments response:', JSON.stringify(assignmentsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  } finally {
    process.exit(0);
  }
}

testMyAssignments();
