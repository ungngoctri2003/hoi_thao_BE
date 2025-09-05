const axios = require('axios');

async function testListAssignments() {
  try {
    console.log('Testing list assignments...');
    
    // First, login to get token
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('Login successful!');
    
    // List assignments
    console.log('\n2. Listing assignments...');
    const listResponse = await axios.get('http://localhost:4000/api/v1/user-conference-assignments', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Assignments found:', listResponse.data.data.length);
    console.log('Full response structure:', JSON.stringify(listResponse.data, null, 2));
    listResponse.data.data.forEach((assignment, index) => {
      console.log(`Assignment ${index}:`, JSON.stringify(assignment, null, 2));
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response?.data) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testListAssignments();
