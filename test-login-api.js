const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login API...');
    
    const response = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@conference.vn',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Login successful!');
      console.log('Token:', data.data.accessToken);
      console.log('User:', data.data.user);
      
      // Test attendees API with token
      console.log('\nTesting attendees API...');
      const attendeesResponse = await fetch('http://localhost:4000/api/v1/attendees', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.data.accessToken}`
        }
      });
      
      const attendeesData = await attendeesResponse.json();
      
      if (attendeesResponse.ok) {
        console.log('Attendees API successful!');
        console.log('Total attendees:', attendeesData.meta?.total || 0);
        console.log('Attendees data:', attendeesData.data?.length || 0, 'items');
      } else {
        console.log('Attendees API failed:', attendeesData);
      }
      
    } else {
      console.log('Login failed:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
