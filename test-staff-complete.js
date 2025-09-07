const fetch = require('node-fetch');

async function testStaffComplete() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  try {
    // Login as staff
    console.log('🔐 Logging in as staff...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'staff2@conference.vn',
        password: 'staff123'
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ Staff login failed:', errorData);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    const staffUser = loginData.data.user;
    console.log('✅ Staff login successful!');
    console.log('Staff user:', staffUser);
    
    // Test comprehensive staff actions
    console.log('\n📋 Testing comprehensive staff actions...');
    
    const comprehensiveActions = [
      // Navigation actions
      { action: 'Truy cập trang Dashboard', page: 'Bảng điều khiển', details: 'Staff accessed main dashboard' },
      { action: 'Truy cập trang Quản lý người tham dự', page: 'Quản lý người tham dự', details: 'Staff accessed attendees management' },
      { action: 'Truy cập trang Check-in', page: 'Check-in', details: 'Staff accessed check-in system' },
      { action: 'Truy cập trang Phân tích', page: 'Phân tích', details: 'Staff accessed analytics dashboard' },
      { action: 'Truy cập trang Cài đặt', page: 'Cài đặt', details: 'Staff accessed settings page' },
      
      // Attendee management actions
      { action: 'Xem danh sách người tham dự', page: 'Quản lý người tham dự', details: 'Staff viewed all attendees list' },
      { action: 'Tìm kiếm người tham dự', page: 'Quản lý người tham dự', details: 'Staff searched for specific attendees' },
      { action: 'Lọc người tham dự theo vai trò', page: 'Quản lý người tham dự', details: 'Staff filtered attendees by role' },
      { action: 'Tạo mới người tham dự', page: 'Quản lý người tham dự', details: 'Staff created new attendee record' },
      { action: 'Cập nhật thông tin người tham dự', page: 'Quản lý người tham dự', details: 'Staff updated attendee information' },
      { action: 'Xóa người tham dự', page: 'Quản lý người tham dự', details: 'Staff deleted attendee record' },
      { action: 'Xuất danh sách người tham dự', page: 'Quản lý người tham dự', details: 'Staff exported attendees list' },
      
      // Check-in/Check-out actions
      { action: 'Check-in người tham dự', page: 'Check-in', details: 'Staff performed attendee check-in' },
      { action: 'Check-out người tham dự', page: 'Check-in', details: 'Staff performed attendee check-out' },
      { action: 'Xem lịch sử Check-in', page: 'Check-in', details: 'Staff viewed check-in history' },
      { action: 'Quét mã QR Check-in', page: 'Check-in', details: 'Staff used QR scanner for check-in' },
      
      // Conference management actions
      { action: 'Xem danh sách hội nghị', page: 'Quản lý hội nghị', details: 'Staff viewed conferences list' },
      { action: 'Tạo mới hội nghị', page: 'Quản lý hội nghị', details: 'Staff created new conference' },
      { action: 'Cập nhật thông tin hội nghị', page: 'Quản lý hội nghị', details: 'Staff updated conference details' },
      { action: 'Xem chi tiết hội nghị', page: 'Quản lý hội nghị', details: 'Staff viewed conference details' },
      
      // Analytics and reporting
      { action: 'Xem báo cáo tham dự', page: 'Phân tích', details: 'Staff viewed attendance reports' },
      { action: 'Xem thống kê Check-in', page: 'Phân tích', details: 'Staff viewed check-in statistics' },
      { action: 'Xuất báo cáo', page: 'Phân tích', details: 'Staff exported analytics report' },
      
      // Profile and settings
      { action: 'Cập nhật hồ sơ cá nhân', page: 'Hồ sơ cá nhân', details: 'Staff updated personal profile' },
      { action: 'Thay đổi mật khẩu', page: 'Cài đặt', details: 'Staff changed password' },
      { action: 'Cập nhật cài đặt hệ thống', page: 'Cài đặt', details: 'Staff updated system settings' },
      
      // File operations
      { action: 'Tải lên danh sách người tham dự', page: 'Quản lý người tham dự', details: 'Staff uploaded attendees list file' },
      { action: 'Tải xuống mẫu đăng ký', page: 'Quản lý người tham dự', details: 'Staff downloaded registration template' },
      
      // Communication
      { action: 'Gửi thông báo', page: 'Thông báo', details: 'Staff sent notification to attendees' },
      { action: 'Xem tin nhắn', page: 'Tin nhắn', details: 'Staff viewed messages' },
      { action: 'Trả lời tin nhắn', page: 'Tin nhắn', details: 'Staff replied to message' }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < comprehensiveActions.length; i++) {
      const action = comprehensiveActions[i];
      console.log(`\n${i + 1}/${comprehensiveActions.length}. Testing: ${action.action}`);
      
      try {
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
          successCount++;
        } else {
          const errorData = await auditResponse.json();
          console.log(`   ❌ ${action.action} failed: ${errorData.error.message}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`   ❌ ${action.action} error: ${error.message}`);
        errorCount++;
      }
      
      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📈 Success Rate: ${((successCount / comprehensiveActions.length) * 100).toFixed(1)}%`);
    
    // Get final audit logs count
    console.log('\n📋 Fetching final audit logs...');
    const logsResponse = await fetch(`${baseURL}/audit/logs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      const totalLogs = logsData.data?.length || 0;
      console.log(`✅ Total audit logs in database: ${totalLogs}`);
      
      // Show recent staff logs
      const recentLogs = logsData.data?.slice(0, 5) || [];
      console.log('\n📝 Recent audit logs:');
      recentLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. [User ${log.USER_ID}] ${log.ACTION_NAME} - ${log.RESOURCE_NAME} (${log.CATEGORY}) - ${log.TS}`);
      });
    } else {
      console.log('❌ Failed to fetch final audit logs');
    }
    
    console.log('\n🎉 Staff audit testing completed!');
    console.log('💡 You can now check the audit logs in the frontend at: http://localhost:3001/audit');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStaffComplete();
