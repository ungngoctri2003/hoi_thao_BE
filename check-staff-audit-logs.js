const fetch = require('node-fetch');

async function checkStaffAuditLogs() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  try {
    // Login as admin to check audit logs
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
    
    // Get all audit logs
    console.log('\nFetching all audit logs...');
    const logsResponse = await fetch(`${baseURL}/audit/logs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (logsResponse.ok) {
      const logsData = await logsResponse.json();
      console.log('✅ Audit logs retrieved successfully!');
      console.log('Total logs:', logsData.data?.length || 0);
      
      if (logsData.data && logsData.data.length > 0) {
        console.log('\nRecent audit logs (last 10):');
        logsData.data.slice(0, 10).forEach((log, index) => {
          const userInfo = log.USER_ID ? `User ${log.USER_ID}` : 'Unknown User';
          const action = log.ACTION_NAME || 'Unknown Action';
          const resource = log.RESOURCE_NAME || 'Unknown Resource';
          const category = log.CATEGORY || 'Unknown Category';
          const timestamp = log.TS || 'Unknown Time';
          
          console.log(`${index + 1}. [${userInfo}] ${action} - ${resource} (${category}) - ${timestamp}`);
        });
        
        // Filter staff user logs
        console.log('\nStaff user audit logs:');
        const staffLogs = logsData.data.filter(log => 
          log.ACTION_NAME && (
            log.ACTION_NAME.includes('Dashboard') ||
            log.ACTION_NAME.includes('người tham dự') ||
            log.ACTION_NAME.includes('Check-in')
          )
        );
        
        if (staffLogs.length > 0) {
          console.log(`Found ${staffLogs.length} staff-related logs:`);
          staffLogs.forEach((log, index) => {
            console.log(`${index + 1}. ${log.ACTION_NAME} - ${log.RESOURCE_NAME} - ${log.TS}`);
          });
        } else {
          console.log('No staff-related logs found');
        }
      }
    } else {
      const errorData = await logsResponse.json();
      console.log('❌ Failed to fetch audit logs:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStaffAuditLogs();
