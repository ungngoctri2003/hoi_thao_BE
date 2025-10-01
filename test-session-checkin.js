// Test script for session-based check-in
const http = require('http');

const testData = {
  // Test 1: Check-in with session ID via QR
  qrWithSession: {
    attendeeId: 68,
    checkInMethod: "qr",
    conferenceId: 12,
    sessionId: 10, // Session ID for check-in
    qrCode: '{"id":68,"conf":12,"session":10,"t":1759332776039,"type":"attendee_registration","cs":"57d0ec5","v":"2.0"}'
  },
  
  // Test 2: Check-in without session (conference-level)
  qrWithoutSession: {
    attendeeId: 68,
    checkInMethod: "qr",
    conferenceId: 12,
    qrCode: '{"id":68,"conf":12,"t":1759332776039,"type":"attendee_registration","cs":"57d0ec5","v":"2.0"}'
  },
  
  // Test 3: Manual check-in with session
  manualWithSession: {
    attendeeId: 68,
    checkInMethod: "manual",
    conferenceId: 12,
    sessionId: 10
  }
};

function makeRequest(data, testName) {
  const postData = JSON.stringify(data);
  
  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/v1/public/checkins/checkin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== ${testName} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', JSON.parse(body));
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`\n=== ${testName} FAILED ===`);
      console.error(e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Session-Based Check-in API\n');
  
  try {
    await makeRequest(testData.qrWithSession, 'Test 1: QR Check-in WITH Session ID');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await makeRequest(testData.qrWithoutSession, 'Test 2: QR Check-in WITHOUT Session ID (Conference-level)');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    await makeRequest(testData.manualWithSession, 'Test 3: Manual Check-in WITH Session ID');
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

runTests();

