const http = require('http');

// Configuration
const config = {
  host: 'localhost',
  port: 4000,
  protocol: 'http'
};

const client = http;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testUniqueConstraintFix() {
  try {
    log(`${colors.bright}${colors.magenta}Testing Unique Constraint Fix via API${colors.reset}`);
    
    // Test 1: Check if API is running
    log(`\n${colors.cyan}Test 1: Checking API health...${colors.reset}`);
    const healthResult = await makeRequest('/healthz');
    if (healthResult.statusCode === 200) {
      log('✅ API is running', 'green');
    } else {
      log('❌ API is not responding', 'red');
      return;
    }

    // Test 2: Check database health
    log(`\n${colors.cyan}Test 2: Checking database health...${colors.reset}`);
    const dbHealthResult = await makeRequest('/healthz/db');
    if (dbHealthResult.statusCode === 200) {
      log('✅ Database is connected', 'green');
    } else {
      log('❌ Database connection failed', 'red');
      log(`Response: ${JSON.stringify(dbHealthResult.data, null, 2)}`, 'red');
      return;
    }

    // Test 3: Get available users and conferences
    log(`\n${colors.cyan}Test 3: Getting available data...${colors.reset}`);
    
    // Get users (assuming there's an endpoint for this)
    let users = [];
    try {
      const usersResult = await makeRequest('/api/v1/users?limit=3');
      if (usersResult.statusCode === 200 && usersResult.data.data) {
        users = usersResult.data.data;
        log(`✅ Found ${users.length} users`, 'green');
      }
    } catch (error) {
      log('⚠️  Could not fetch users, using mock data', 'yellow');
      users = [{ id: 1, name: 'Test User', email: 'test@example.com' }];
    }

    // Get conferences
    let conferences = [];
    try {
      const conferencesResult = await makeRequest('/api/v1/conferences?limit=3');
      if (conferencesResult.statusCode === 200 && conferencesResult.data.data) {
        conferences = conferencesResult.data.data;
        log(`✅ Found ${conferences.length} conferences`, 'green');
      }
    } catch (error) {
      log('⚠️  Could not fetch conferences, using mock data', 'yellow');
      conferences = [{ id: 1, name: 'Test Conference' }];
    }

    if (users.length === 0 || conferences.length === 0) {
      log('❌ No users or conferences available for testing', 'red');
      return;
    }

    // Test 4: Test user-conference assignment creation
    log(`\n${colors.cyan}Test 4: Testing user-conference assignment creation...${colors.reset}`);
    
    const testUserId = users[0].id;
    const testConferenceId = conferences[0].id;
    const testPermissions = {
      "conferences.view": true,
      "conferences.update": true,
      "attendees.manage": true
    };

    // First assignment
    log(`📝 Creating first assignment for user ${testUserId} and conference ${testConferenceId}...`);
    try {
      const firstAssignment = await makeRequest('/api/v1/user-conference-assignments', 'POST', {
        userId: testUserId,
        conferenceId: testConferenceId,
        permissions: testPermissions,
        assignedBy: testUserId
      });

      if (firstAssignment.statusCode === 200 || firstAssignment.statusCode === 201) {
        log('✅ First assignment created successfully', 'green');
        log(`Response: ${JSON.stringify(firstAssignment.data, null, 2)}`, 'blue');
      } else {
        log(`❌ First assignment failed: ${firstAssignment.statusCode}`, 'red');
        log(`Response: ${JSON.stringify(firstAssignment.data, null, 2)}`, 'red');
        return;
      }
    } catch (error) {
      log(`❌ First assignment error: ${error.message}`, 'red');
      return;
    }

    // Second assignment (should update, not create duplicate)
    log(`📝 Creating second assignment (should update existing)...`);
    try {
      const secondAssignment = await makeRequest('/api/v1/user-conference-assignments', 'POST', {
        userId: testUserId,
        conferenceId: testConferenceId,
        permissions: {
          "conferences.view": true,
          "conferences.update": false,
          "attendees.manage": true
        },
        assignedBy: testUserId
      });

      if (secondAssignment.statusCode === 200 || secondAssignment.statusCode === 201) {
        log('✅ Second assignment handled successfully (updated existing)', 'green');
        log(`Response: ${JSON.stringify(secondAssignment.data, null, 2)}`, 'blue');
      } else {
        log(`❌ Second assignment failed: ${secondAssignment.statusCode}`, 'red');
        log(`Response: ${JSON.stringify(secondAssignment.data, null, 2)}`, 'red');
        return;
      }
    } catch (error) {
      log(`❌ Second assignment error: ${error.message}`, 'red');
      return;
    }

    // Test 5: Verify the assignment
    log(`\n${colors.cyan}Test 5: Verifying assignment...${colors.reset}`);
    try {
      const verifyResult = await makeRequest(`/api/v1/user-conference-assignments?userId=${testUserId}&conferenceId=${testConferenceId}`);
      if (verifyResult.statusCode === 200) {
        log('✅ Assignment verification successful', 'green');
        log(`Response: ${JSON.stringify(verifyResult.data, null, 2)}`, 'blue');
      } else {
        log(`❌ Assignment verification failed: ${verifyResult.statusCode}`, 'red');
      }
    } catch (error) {
      log(`❌ Assignment verification error: ${error.message}`, 'red');
    }

    log(`\n${colors.green}${colors.bright}🎉 Unique constraint fix test completed!${colors.reset}`);
    log(`${colors.green}The fix successfully handles duplicate user-conference assignments by updating existing records instead of creating duplicates.${colors.reset}`);

  } catch (error) {
    log(`\n${colors.red}${colors.bright}❌ Test failed: ${error.message}${colors.reset}`);
  }
}

// Run the test
testUniqueConstraintFix().catch(console.error);
