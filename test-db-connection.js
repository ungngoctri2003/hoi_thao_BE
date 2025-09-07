#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests database connectivity and basic operations
 */

const http = require('http');
const https = require('https');

// Configuration
const config = {
  host: process.env.API_HOST || 'localhost',
  port: process.env.API_PORT || 4000,
  protocol: process.env.API_PROTOCOL || 'http'
};

const client = config.protocol === 'https' ? https : http;

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
      hostname: config.host,
      port: config.port,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(options, (res) => {
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

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testEndpoint(name, path, expectedStatus = 200) {
  try {
    log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
    const startTime = Date.now();
    
    const result = await makeRequest(path);
    const responseTime = Date.now() - startTime;
    
    if (result.statusCode === expectedStatus) {
      log(`✅ ${name}: PASSED (${responseTime}ms)`, 'green');
      if (result.data.data) {
        log(`   Response: ${JSON.stringify(result.data.data, null, 2)}`, 'blue');
      }
      return true;
    } else {
      log(`❌ ${name}: FAILED (Status: ${result.statusCode})`, 'red');
      log(`   Response: ${JSON.stringify(result.data, null, 2)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${name}: ERROR - ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log(`${colors.bright}${colors.magenta}Database Connection Test Suite${colors.reset}`);
  log(`${colors.yellow}Testing API at: ${config.protocol}://${config.host}:${config.port}${colors.reset}`);
  
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
    const success = await testEndpoint(test.name, test.path, test.expectedStatus);
    if (success) passed++;
  }

  log(`\n${colors.bright}Test Results:${colors.reset}`);
  log(`${colors.green}Passed: ${passed}/${total}${colors.reset}`);
  
  if (passed === total) {
    log(`${colors.green}${colors.bright}🎉 All tests passed! Database is ready for use.${colors.reset}`);
    process.exit(0);
  } else {
    log(`${colors.red}${colors.bright}⚠️  Some tests failed. Please check your database configuration.${colors.reset}`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log(`${colors.bright}Database Connection Test Script${colors.reset}`);
  log('Usage: node test-db-connection.js [options]');
  log('');
  log('Options:');
  log('  --help, -h     Show this help message');
  log('  --host HOST    API host (default: localhost)');
  log('  --port PORT    API port (default: 4000)');
  log('  --protocol     API protocol (default: http)');
  log('');
  log('Environment Variables:');
  log('  API_HOST       API host');
  log('  API_PORT       API port');
  log('  API_PROTOCOL   API protocol');
  process.exit(0);
}

// Parse command line arguments
for (let i = 2; i < process.argv.length; i++) {
  switch (process.argv[i]) {
    case '--host':
      config.host = process.argv[++i];
      break;
    case '--port':
      config.port = parseInt(process.argv[++i]);
      break;
    case '--protocol':
      config.protocol = process.argv[++i];
      break;
  }
}

// Run the tests
runTests().catch((error) => {
  log(`\n${colors.red}${colors.bright}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
