const fetch = require('node-fetch');

async function createStaffUser() {
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
    
    // Create new staff user
    console.log('\nCreating new staff user...');
    const createResponse = await fetch(`${baseURL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: 'staff2@conference.vn',
        name: 'Nguyễn Văn Staff',
        password: 'staff123',
        role: 'staff'
      })
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Staff user created successfully!');
      console.log('User info:', createData.data);
      
      // Test staff login
      console.log('\nTesting staff login...');
      const staffLoginResponse = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'staff2@conference.vn',
          password: 'staff123'
        })
      });
      
      if (staffLoginResponse.ok) {
        const staffLoginData = await staffLoginResponse.json();
        console.log('✅ Staff login successful!');
        console.log('Staff user info:', staffLoginData.data.user);
        
        // Test staff audit actions
        console.log('\nTesting staff audit actions...');
        await testStaffAuditActions(baseURL, staffLoginData.data.accessToken);
        
      } else {
        const errorData = await staffLoginResponse.json();
        console.log('❌ Staff login failed:', errorData);
      }
      
    } else {
      const errorData = await createResponse.json();
      console.log('❌ Failed to create staff user:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testStaffAuditActions(baseURL, token) {
  try {
    const staffActions = [
      {
        action: 'Truy cập trang Dashboard',
        page: 'Bảng điều khiển',
        details: 'Staff user accessed dashboard'
      },
      {
        action: 'Xem danh sách người tham dự',
        page: 'Quản lý người tham dự',
        details: 'Staff user viewed attendees list'
      },
      {
        action: 'Tạo mới người tham dự',
        page: 'Quản lý người tham dự',
        details: 'Staff user created new attendee'
      },
      {
        action: 'Check-in người tham dự',
        page: 'Check-in',
        details: 'Staff user performed check-in'
      }
    ];
    
    for (let i = 0; i < staffActions.length; i++) {
      const action = staffActions[i];
      console.log(`\n${i + 1}. Testing: ${action.action}`);
      
      const auditResponse = await fetch(`${baseURL}/audit/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(action)
      });
      
      if (auditResponse.ok) {
        console.log(`   ✅ ${action.action} logged successfully`);
      } else {
        const errorData = await auditResponse.json();
        console.log(`   ❌ ${action.action} failed:`, errorData);
      }
      
      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n✅ Staff audit testing completed!');
    
  } catch (error) {
    console.error('❌ Staff audit actions test failed:', error.message);
  }
}

createStaffUser();
