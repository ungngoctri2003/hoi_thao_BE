const fetch = require('node-fetch');

async function testAuditLogsAPI() {
  const baseURL = 'http://localhost:4000/api/v1';
  
  try {
    // First, login to get a token
    console.log('Logging in...');
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
      console.log('❌ Login failed:', errorData);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    console.log('✅ Login successful!');
    
    // Test frontend audit logging
    console.log('\nTesting frontend audit logging...');
    const auditResponse = await fetch(`${baseURL}/audit/frontend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'Test Frontend Action',
        page: 'Test Page',
        details: 'Test Details from API script'
      })
    });
    
    if (auditResponse.ok) {
      console.log('✅ Frontend audit logging successful!');
    } else {
      const errorData = await auditResponse.json();
      console.log('❌ Frontend audit error:', errorData);
    }
    
    // Get audit logs
    console.log('\nFetching audit logs...');
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
        console.log('\nRecent audit logs:');
        console.log('Sample log structure:', JSON.stringify(logsData.data[0], null, 2));
        logsData.data.slice(0, 5).forEach((log, index) => {
          console.log(`${index + 1}. ${log.ACTION_NAME || log.actionName} - ${log.RESOURCE_NAME || log.resourceName} - ${log.CATEGORY || log.category} - ${log.TS || log.timestamp}`);
        });
      }
    } else {
      const errorData = await logsResponse.json();
      console.log('❌ Failed to fetch audit logs:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuditLogsAPI();
