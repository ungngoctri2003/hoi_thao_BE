const axios = require('axios');

async function testUsersCount() {
  try {
    console.log('Testing users count for scroll...');
    
    // First, login to get token
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('Login successful!');
    
    // Get users
    console.log('\n2. Getting users...');
    const usersResponse = await axios.get('http://localhost:4000/api/v1/users?page=1&limit=1000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const allUsers = usersResponse.data.data;
    const staffUsers = allUsers.filter(user => user.role === 'staff');
    
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Staff users: ${staffUsers.length}`);
    
    if (staffUsers.length < 10) {
      console.log('\n⚠️  Not enough staff users to test scroll. Creating some test users...');
      
      // Create some test staff users
      for (let i = 1; i <= 15; i++) {
        try {
          await axios.post('http://localhost:4000/api/v1/users', {
            name: `Staff Test ${i}`,
            email: `staff${i}@test.com`,
            password: 'password123',
            role: 'staff'
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`✅ Created staff user ${i}`);
        } catch (error) {
          if (error.response?.status === 409) {
            console.log(`⏭️  Staff user ${i} already exists`);
          } else {
            console.log(`❌ Failed to create staff user ${i}:`, error.message);
          }
        }
      }
      
      // Get updated count
      const updatedResponse = await axios.get('http://localhost:4000/api/v1/users?page=1&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const updatedStaffUsers = updatedResponse.data.data.filter(user => user.role === 'staff');
      console.log(`\nUpdated staff users count: ${updatedStaffUsers.length}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response?.data) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testUsersCount();
