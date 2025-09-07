const axios = require('axios');

async function testUserRoles() {
  try {
    console.log('Testing user roles...');
    
    // First, login to get token
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('Login successful!');
    
    // Try to assign role to a user
    console.log('\n2. Assigning staff role to user ID 2...');
    try {
      const assignResponse = await axios.post('http://localhost:4000/api/v1/roles/assign', {
        userId: 2,
        roleId: 2  // staff role
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Role assignment successful:', assignResponse.data);
    } catch (error) {
      console.log('Role assignment failed:', error.response?.data || error.message);
    }
    
    // Check user roles again
    console.log('\n3. Checking user roles after assignment...');
    const usersResponse = await axios.get('http://localhost:4000/api/v1/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Users found:', usersResponse.data.data.length);
    usersResponse.data.data.forEach(user => {
      console.log(`- ID: ${user.ID}, EMAIL: ${user.EMAIL}, NAME: ${user.NAME}, ROLE: ${user.ROLE || 'No role'}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response?.data) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testUserRoles();
