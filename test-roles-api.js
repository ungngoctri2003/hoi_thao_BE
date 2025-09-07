const axios = require('axios');

async function testRolesAPI() {
  try {
    console.log('Testing roles API...');
    
    // First, login to get token
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('Login successful!');
    
    // Get all roles
    console.log('\n2. Getting all roles...');
    const rolesResponse = await axios.get('http://localhost:4000/api/v1/roles', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Roles found:', rolesResponse.data.data.length);
    rolesResponse.data.data.forEach(role => {
      console.log(`- ID: ${role.ID}, CODE: ${role.CODE}, NAME: ${role.NAME}`);
    });
    
    // Get all users
    console.log('\n3. Getting all users...');
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

testRolesAPI();
