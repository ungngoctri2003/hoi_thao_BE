const fetch = require('node-fetch');
const bcrypt = require('bcrypt');

async function setStaffPassword() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  try {
    // First login as admin
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
    
    // Get staff user info
    console.log('\nGetting staff user info...');
    const staffResponse = await fetch(`${baseURL}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!staffResponse.ok) {
      const errorData = await staffResponse.json();
      console.log('❌ Failed to get users:', errorData);
      return;
    }
    
    const usersData = await staffResponse.json();
    const staffUser = usersData.data.find(user => user.email === 'staff@conference.vn');
    
    if (!staffUser) {
      console.log('❌ Staff user not found');
      return;
    }
    
    console.log('✅ Staff user found:', staffUser);
    
    // Hash password
    const hashedPassword = await bcrypt.hash('staff123', 10);
    console.log('✅ Password hashed');
    
    // Update staff user with password
    console.log('\nUpdating staff user password...');
    const updateResponse = await fetch(`${baseURL}/users/${staffUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        password: hashedPassword
      })
    });
    
    if (updateResponse.ok) {
      console.log('✅ Staff password updated successfully!');
      
      // Test staff login
      console.log('\nTesting staff login...');
      const staffLoginResponse = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'staff@conference.vn',
          password: 'staff123'
        })
      });
      
      if (staffLoginResponse.ok) {
        const staffLoginData = await staffLoginResponse.json();
        console.log('✅ Staff login successful!');
        console.log('Staff user info:', staffLoginData.data.user);
      } else {
        const errorData = await staffLoginResponse.json();
        console.log('❌ Staff login failed:', errorData);
      }
      
    } else {
      const errorData = await updateResponse.json();
      console.log('❌ Failed to update staff password:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setStaffPassword();
