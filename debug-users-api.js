const fetch = require('node-fetch');

async function debugUsersAPI() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  try {
    // Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@conference.vn',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ Admin login failed:', errorData);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    console.log('✅ Admin login successful!');
    
    // Get users
    console.log('\nGetting users...');
    const usersResponse = await fetch(`${baseURL}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!usersResponse.ok) {
      const errorData = await usersResponse.json();
      console.log('❌ Failed to get users:', errorData);
      return;
    }
    
    const usersData = await usersResponse.json();
    console.log('✅ Users retrieved successfully!');
    console.log('Total users:', usersData.data?.length || 0);
    
    if (usersData.data && usersData.data.length > 0) {
      console.log('\nAll users:');
      usersData.data.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role || 'N/A'}`);
      });
      
      // Look for staff user
      const staffUser = usersData.data.find(user => user.email === 'staff@conference.vn');
      if (staffUser) {
        console.log('\n✅ Staff user found:', staffUser);
      } else {
        console.log('\n❌ Staff user not found in API response');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugUsersAPI();
