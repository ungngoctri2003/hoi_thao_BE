const axios = require('axios');

async function testAssignment() {
  try {
    console.log('Testing conference assignment...');
    
    // First, login to get token
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
      email: 'admin@conference.vn',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('Login successful!');
    
    // Test single assignment
    console.log('\n2. Testing single assignment...');
    try {
      const assignResponse = await axios.post('http://localhost:4000/api/v1/user-conference-assignments', {
        userId: 2,  // staff@conference.vn
        conferenceId: 3,  // Seminar Khởi nghiệp
        permissions: {
          "conferences.view": true,
          "conferences.update": true,
          "attendees.manage": true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Single assignment successful:', assignResponse.data);
    } catch (error) {
      console.log('Single assignment failed:', error.response?.data || error.message);
    }
    
    // Test bulk assignment
    console.log('\n3. Testing bulk assignment...');
    try {
      const bulkAssignResponse = await axios.post('http://localhost:4000/api/v1/user-conference-assignments/bulk', {
        userId: 3,  // user@conference.vn
        conferenceIds: [3],  // Seminar Khởi nghiệp
        permissions: {
          "conferences.view": true,
          "attendees.read": true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Bulk assignment successful:', bulkAssignResponse.data);
    } catch (error) {
      console.log('Bulk assignment failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response?.data) {
      console.log('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAssignment();
