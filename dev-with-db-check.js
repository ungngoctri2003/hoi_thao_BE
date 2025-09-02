#!/usr/bin/env node

/**
 * Development Server with Database Check
 * Runs the development server with database connectivity checks
 */

const { spawn } = require('child_process');

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

function startDevServer() {
  log(`${colors.bright}${colors.magenta}Starting Development Server with Database Checks${colors.reset}`);
  log(`${colors.yellow}The server will perform database connectivity checks on startup.${colors.reset}`);
  log(`${colors.cyan}Watch the logs below for database status...${colors.reset}\n`);
  
  // Start the development server
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  // Handle process events
  devProcess.on('close', (code) => {
    log(`${colors.yellow}Development server exited with code ${code}${colors.reset}`);
    process.exit(code);
  });

  devProcess.on('error', (error) => {
    log(`${colors.red}Failed to start development server: ${error.message}${colors.reset}`);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log(`${colors.yellow}Shutting down development server...${colors.reset}`);
    devProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    log(`${colors.yellow}Shutting down development server...${colors.reset}`);
    devProcess.kill('SIGTERM');
  });
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log(`${colors.bright}Development Server with Database Check${colors.reset}`);
  log('Usage: node dev-with-db-check.js');
  log('');
  log('This script will:');
  log('1. Start the development server (npm run dev)');
  log('2. The server will automatically check database connectivity on startup');
  log('3. Display database status in the server logs');
  log('4. Continue running with hot reload');
  log('');
  log('Database checks include:');
  log('- Connection test');
  log('- Schema validation');
  log('- Operations test (INSERT/SELECT/DELETE with RETURNING ID)');
  process.exit(0);
}

// Start the development server
startDevServer();
