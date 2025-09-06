const fetch = require('node-fetch');

async function testStaffAudit() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  try {
    // Login as staff
    console.log('Logging in as staff...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'staff@conference.vn',
        password: 'staff123' // Assuming default password
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ Staff login failed:', errorData);
      
      // Try with different password
      console.log('\nTrying with admin123...');
      const loginResponse2 = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'staff@conference.vn',
          password: 'admin123'
        })
      });
      
      if (!loginResponse2.ok) {
        const errorData2 = await loginResponse2.json();
        console.log('❌ Staff login failed with admin123:', errorData2);
        return;
      }
      
      const loginData = await loginResponse2.json();
      const token = loginData.data.accessToken;
      console.log('✅ Staff login successful with admin123!');
      console.log('User info:', loginData.data.user);
      
      await testStaffActions(baseURL, token);
    } else {
      const loginData = await loginResponse.json();
      const token = loginData.data.accessToken;
      console.log('✅ Staff login successful!');
      console.log('User info:', loginData.data.user);
      
      await testStaffActions(baseURL, token);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testStaffActions(baseURL, token) {
  try {
    // Test various staff actions
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
        action: 'Cập nhật thông tin người tham dự',
        page: 'Quản lý người tham dự',
        details: 'Staff user updated attendee information'
      },
      {
        action: 'Tìm kiếm người tham dự',
        page: 'Quản lý người tham dự',
        details: 'Staff user searched for attendees'
      },
      {
        action: 'Check-in người tham dự',
        page: 'Check-in',
        details: 'Staff user performed check-in'
      },
      {
        action: 'Xem báo cáo tham dự',
        page: 'Phân tích',
        details: 'Staff user viewed attendance reports'
      }
    ];
    
    console.log('\nTesting staff actions...');
    
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
    
    // Get audit logs for staff user
    console.log('\nFetching staff audit logs...');
    const logsResponse = await fetch(`${baseURL}/audit/logs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log('✅ Staff audit logs retrieved successfully!');
      console.log('Total logs:', logsData.data?.length || 0);
      
      if (logsData.data && logsData.data.length > 0) {
        console.log('\nRecent staff audit logs:');
        logsData.data.slice(0, 10).forEach((log, index) => {
          console.log(`${index + 1}. ${log.ACTION_NAME || log.actionName} - ${log.RESOURCE_NAME || log.resourceName} - ${log.CATEGORY || log.category} - ${log.TS || log.timestamp}`);
        });
      }
    } else {
      const errorData = await logsResponse.json();
      console.log('❌ Failed to fetch staff audit logs:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Staff actions test failed:', error.message);
  }
}

testStaffAudit();
