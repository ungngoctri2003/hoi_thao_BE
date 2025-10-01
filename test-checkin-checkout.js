// Test script for check-in and check-out functionality
const http = require('http');

const testData = {
  // Test 1: Check-in qua QR
  checkinQR: {
    checkInMethod: "qr",
    conferenceId: 12,
    sessionId: 10,
    actionType: "checkin",
    qrCode: '{"id":68,"conf":12,"session":10,"t":1759332776039,"type":"attendee_registration","cs":"57d0ec5","v":"2.0"}'
  },
  
  // Test 2: Check-out qua QR
  checkoutQR: {
    checkInMethod: "qr",
    conferenceId: 12,
    sessionId: 10,
    actionType: "checkout",
    qrCode: '{"id":68,"conf":12,"session":10,"t":1759332776039,"type":"attendee_registration","cs":"57d0ec5","v":"2.0"}'
  },
  
  // Test 3: Check-in manual
  checkinManual: {
    attendeeId: 68,
    checkInMethod: "manual",
    conferenceId: 12,
    sessionId: 10,
    actionType: "checkin"
  },
  
  // Test 4: Check-out manual
  checkoutManual: {
    attendeeId: 68,
    checkInMethod: "manual",
    conferenceId: 12,
    sessionId: 10,
    actionType: "checkout"
  },
  
  // Test 5: Check-in conference-level (no session)
  checkinConference: {
    checkInMethod: "qr",
    conferenceId: 12,
    actionType: "checkin",
    qrCode: '{"id":68,"conf":12,"t":1759332776039,"type":"attendee_registration"}'
  },
  
  // Test 6: Check-out conference-level (no session)
  checkoutConference: {
    checkInMethod: "qr",
    conferenceId: 12,
    actionType: "checkout",
    qrCode: '{"id":68,"conf":12,"t":1759332776039,"type":"attendee_registration"}'
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
        console.log(`\n${'='.repeat(80)}`);
        console.log(`${testName}`);
        console.log('='.repeat(80));
        console.log(`Status: ${res.statusCode}`);
        
        try {
          const jsonResponse = JSON.parse(body);
          console.log('Response:');
          console.log(JSON.stringify(jsonResponse, null, 2));
          
          // Validate response
          if (jsonResponse.data) {
            console.log('\n✓ Validation:');
            console.log(`  - ACTION_TYPE: ${jsonResponse.data.ACTION_TYPE}`);
            console.log(`  - SESSION_ID: ${jsonResponse.data.SESSION_ID || 'NULL (conference-level)'}`);
            console.log(`  - STATUS: ${jsonResponse.data.STATUS}`);
            console.log(`  - ATTENDEE: ${jsonResponse.data.ATTENDEE_NAME}`);
            console.log(`  - METHOD: ${jsonResponse.data.METHOD}`);
          }
        } catch (e) {
          console.log('Response (raw):', body);
        }
        
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`\n${'='.repeat(80)}`);
      console.error(`${testName} FAILED`);
      console.error('='.repeat(80));
      console.error(e);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Testing Check-in / Check-out Functionality                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Wait helper
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Test 1: Check-in qua QR với session
    await makeRequest(testData.checkinQR, '📱 Test 1: Check-in qua QR (with session)');
    await wait(1500);
    
    // Test 2: Check-in duplicate (should return duplicate)
    await makeRequest(testData.checkinQR, '📱 Test 2: Check-in duplicate (same session, should be duplicate)');
    await wait(1500);
    
    // Test 3: Check-out qua QR với session
    await makeRequest(testData.checkoutQR, '📱 Test 3: Check-out qua QR (with session)');
    await wait(1500);
    
    // Test 4: Check-out duplicate
    await makeRequest(testData.checkoutQR, '📱 Test 4: Check-out duplicate (should be duplicate)');
    await wait(1500);
    
    // Test 5: Check-in manual
    await makeRequest(testData.checkinManual, '✋ Test 5: Check-in manual (with session)');
    await wait(1500);
    
    // Test 6: Check-out manual
    await makeRequest(testData.checkoutManual, '✋ Test 6: Check-out manual (with session)');
    await wait(1500);
    
    // Test 7: Check-in conference-level (no session)
    await makeRequest(testData.checkinConference, '🏛️  Test 7: Check-in conference-level (no session)');
    await wait(1500);
    
    // Test 8: Check-out conference-level (no session)
    await makeRequest(testData.checkoutConference, '🏛️  Test 8: Check-out conference-level (no session)');
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        All tests completed!                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Summary:');
    console.log('  - Test 1-2: QR Check-in with session (success + duplicate)');
    console.log('  - Test 3-4: QR Check-out with session (success + duplicate)');
    console.log('  - Test 5-6: Manual Check-in/out with session');
    console.log('  - Test 7-8: Conference-level Check-in/out (no session)');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify database records: SELECT * FROM CHECKINS ORDER BY ID DESC;');
    console.log('  2. Check REGISTRATIONS status updates');
    console.log('  3. Run frontend tests');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

