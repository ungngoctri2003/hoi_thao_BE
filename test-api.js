const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  try {
    console.log('🧪 Testing API...');
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:4000/api/v1/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test attendees endpoint without auth (should fail)
    try {
      const attendeesResponse = await fetch('http://localhost:4000/api/v1/attendees/with-conferences?page=1&limit=20');
      const attendeesData = await attendeesResponse.json();
      console.log('❌ Attendees without auth:', attendeesData);
    } catch (error) {
      console.log('✅ Attendees endpoint correctly requires auth');
    }
    
    // Test with fake token
    try {
      const attendeesResponse = await fetch('http://localhost:4000/api/v1/attendees/with-conferences?page=1&limit=20', {
        headers: {
          'Authorization': 'Bearer fake-token'
        }
      });
      const attendeesData = await attendeesResponse.json();
      console.log('🔍 Attendees with fake token:', attendeesData);
    } catch (error) {
      console.log('❌ Error with fake token:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPI();
