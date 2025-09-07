// Test admin login
const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Login failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAdminLogin();
