#!/usr/bin/env node

/**
 * Start Server with Database Check
 * Ensures database is connected before starting the server
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

// Configuration
const config = {
  host: 'localhost',
  port: process.env.PORT || 4000,
  protocol: 'http',
  maxRetries: 30,
  retryDelay: 2000
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

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function waitForServer() {
  log(`${colors.yellow}Waiting for server to start...${colors.reset}`);
  
  for (let i = 0; i < config.maxRetries; i++) {
    try {
      await makeRequest('/healthz');
      log(`${colors.green}✅ Server is running${colors.reset}`);
      return true;
    } catch (error) {
      if (i < config.maxRetries - 1) {
        log(`${colors.yellow}⏳ Attempt ${i + 1}/${config.maxRetries} - Server not ready yet, waiting ${config.retryDelay}ms...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }
  
  log(`${colors.red}❌ Server failed to start within ${config.maxRetries * config.retryDelay / 1000} seconds${colors.reset}`);
  return false;
}

async function checkDatabase() {
  log(`${colors.cyan}Checking database connection...${colors.reset}`);
  
  try {
    const result = await makeRequest('/healthz/db');
    
    if (result.statusCode === 200) {
      log(`${colors.green}✅ Database connection successful${colors.reset}`);
      if (result.data.data) {
        log(`${colors.blue}   Response time: ${result.data.data.response_time_ms}ms${colors.reset}`);
      }
      return true;
    } else {
      log(`${colors.red}❌ Database connection failed${colors.reset}`);
      log(`${colors.red}   Status: ${result.statusCode}${colors.reset}`);
      log(`${colors.red}   Response: ${JSON.stringify(result.data, null, 2)}${colors.reset}`);
      return false;
    }
  } catch (error) {
    log(`${colors.red}❌ Database check failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function checkSchema() {
  log(`${colors.cyan}Checking database schema...${colors.reset}`);
  
  try {
    const result = await makeRequest('/api/v1/health/db/schema');
    
    if (result.statusCode === 200) {
      log(`${colors.green} Database schema is complete${colors.reset}`);
      return true;
    } else if (result.statusCode === 503) {
      log(`${colors.yellow} Database schema is incomplete${colors.reset}`);
      if (result.data.data && result.data.data.schema_validation) {
        const missing = result.data.data.schema_validation.missing_tables;
        if (missing && missing.length > 0) {
          log(`${colors.yellow}   Missing tables: ${missing.join(', ')}${colors.reset}`);
        }
      }
      return false;
    } else {
      log(`${colors.red} Schema check failed${colors.reset}`);
      log(`${colors.red}   Status: ${result.statusCode}${colors.reset}`);
      return false;
    }
  } catch (error) {
    log(`${colors.red} Schema check failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function startServer() {
  log(`${colors.bright}${colors.magenta}Starting Conference Management System${colors.reset}`);
  
  // Start the server
  const serverProcess = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true
  });

  // Wait for server to start
  const serverReady = await waitForServer();
  if (!serverReady) {
    serverProcess.kill();
    process.exit(1);
  }

  // Check database connection
  const dbConnected = await checkDatabase();
  if (!dbConnected) {
    log(`${colors.red}${colors.bright}Database connection failed. Server will continue but may not work properly.${colors.reset}`);
    log(`${colors.yellow}Please check your database configuration and try again.${colors.reset}`);
  }

  // Check database schema
  const schemaComplete = await checkSchema();
  if (!schemaComplete) {
    log(`${colors.yellow}${colors.bright}Database schema is incomplete. Some features may not work.${colors.reset}`);
    log(`${colors.yellow}Please run the database migration scripts to create missing tables.${colors.reset}`);
  }

  if (dbConnected && schemaComplete) {
    log(`${colors.green}${colors.bright}🎉 System is ready! All checks passed.${colors.reset}`);
  } else {
    log(`${colors.yellow}${colors.bright}⚠️  System started with warnings. Please check the issues above.${colors.reset}`);
  }

  // Handle server process
  serverProcess.on('close', (code) => {
    log(`${colors.yellow}Server process exited with code ${code}${colors.reset}`);
    process.exit(code);
  });

  serverProcess.on('error', (error) => {
    log(`${colors.red}Failed to start server: ${error.message}${colors.reset}`);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log(`${colors.yellow}Shutting down server...${colors.reset}`);
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    log(`${colors.yellow}Shutting down server...${colors.reset}`);
    serverProcess.kill('SIGTERM');
  });
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log(`${colors.bright}Start Server with Database Check${colors.reset}`);
  log('Usage: node start-with-db-check.js [options]');
  log('');
  log('Options:');
  log('  --help, -h     Show this help message');
  log('  --skip-db      Skip database checks');
  log('  --skip-schema  Skip schema validation');
  log('');
  log('This script will:');
  log('1. Start the server');
  log('2. Wait for server to be ready');
  log('3. Check database connection');
  log('4. Validate database schema');
  log('5. Report status and continue running');
  process.exit(0);
}

// Start the server
startServer().catch((error) => {
  log(`\n${colors.red}${colors.bright}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
