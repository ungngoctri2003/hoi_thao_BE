#!/usr/bin/env node

/**
 * Test Startup Database Check
 * Quick test to verify the startup database check functionality
 */

const http = require('http');

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

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testStartupChecks() {
  log(`${colors.bright}${colors.magenta}Testing Startup Database Check${colors.reset}`);
  log(`${colors.yellow}Make sure the server is running with: npm run dev${colors.reset}\n`);
  
  const tests = [
    {
      name: 'Basic Health Check',
      path: '/healthz',
      expectedStatus: 200
    },
    {
      name: 'Database Health Check',
      path: '/healthz/db',
      expectedStatus: 200
    },
    {
      name: 'API Health Check',
      path: '/api/v1/health',
      expectedStatus: 200
    },
    {
      name: 'Database Connection Test',
      path: '/api/v1/health/db',
      expectedStatus: 200
    },
    {
      name: 'Database Schema Validation',
      path: '/api/v1/health/db/schema',
      expectedStatus: 200
    },
    {
      name: 'Database Operations Test',
      path: '/api/v1/health/db/operations',
      expectedStatus: 200
    }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      log(`${colors.cyan}Testing ${test.name}...${colors.reset}`);
      const startTime = Date.now();
      
      const result = await makeRequest(test.path);
      const responseTime = Date.now() - startTime;
      
      if (result.statusCode === test.expectedStatus) {
        log(`${colors.green}✅ ${test.name}: PASSED (${responseTime}ms)${colors.reset}`);
        if (result.data.data) {
          log(`${colors.blue}   Response: ${JSON.stringify(result.data.data, null, 2)}${colors.reset}`);
        }
        passed++;
      } else {
        log(`${colors.red}❌ ${test.name}: FAILED (Status: ${result.statusCode})${colors.reset}`);
        log(`${colors.red}   Response: ${JSON.stringify(result.data, null, 2)}${colors.reset}`);
      }
    } catch (error) {
      log(`${colors.red}❌ ${test.name}: ERROR - ${error.message}${colors.reset}`);
    }
  }

  log(`\n${colors.bright}Test Results:${colors.reset}`);
  log(`${colors.green}Passed: ${passed}/${total}${colors.reset}`);
  
  if (passed === total) {
    log(`${colors.green}${colors.bright}🎉 All startup checks passed! Database is ready.${colors.reset}`);
    log(`${colors.cyan}You can now run: npm run dev${colors.reset}`);
  } else {
    log(`${colors.red}${colors.bright}⚠️  Some startup checks failed. Please check your database configuration.${colors.reset}`);
    log(`${colors.yellow}Make sure to:${colors.reset}`);
    log(`${colors.yellow}1. Start the server: npm run dev${colors.reset}`);
    log(`${colors.yellow}2. Check database connection${colors.reset}`);
    log(`${colors.yellow}3. Verify database schema${colors.reset}`);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log(`${colors.bright}Test Startup Database Check${colors.reset}`);
  log('Usage: node test-startup-check.js');
  log('');
  log('This script tests the startup database check functionality by:');
  log('1. Making requests to all health check endpoints');
  log('2. Verifying database connectivity');
  log('3. Checking schema validation');
  log('4. Testing database operations');
  log('');
  log('Prerequisites:');
  log('- Server must be running (npm run dev)');
  log('- Database must be configured');
  process.exit(0);
}

// Run the tests
testStartupChecks().catch((error) => {
  log(`\n${colors.red}${colors.bright}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
