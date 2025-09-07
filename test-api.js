const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

// Test configuration
const testConfig = {
  timeout: 5000,
  baseURL: BASE_URL
};

// Create axios instance
const api = axios.create(testConfig);

// Test results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to run a test
async function runTest(name, testFn) {
  testResults.total++;
  try {
    console.log(`🧪 Testing: ${name}`);
    await testFn();
    testResults.passed++;
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
    console.log(`❌ FAILED: ${name} - ${error.message}`);
  }
}

// Test functions
async function testHealthCheck() {
  const response = await api.get('/ping');
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  if (!response.data.data || response.data.data !== 'pong') {
    throw new Error('Health check response invalid');
  }
}

async function testHealthStatus() {
  const response = await api.get('/healthz');
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  if (!response.data.data || !response.data.data.status) {
    throw new Error('Health status response invalid');
  }
}

async function testSwaggerDocs() {
  try {
    const response = await axios.get('http://localhost:4000/docs', { timeout: 3000 });
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - please start with npm run dev');
    }
    throw error;
  }
}

async function testConferencesEndpoint() {
  try {
    const response = await api.get('/conferences');
    // This might fail due to auth, but we check if endpoint exists
    if (response.status === 200 || response.status === 401) {
      return; // Endpoint exists
    }
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return; // Endpoint exists but requires auth
    }
    throw error;
  }
}

async function testAttendeesEndpoint() {
  try {
    const response = await api.get('/attendees');
    if (response.status === 200 || response.status === 401) {
      return;
    }
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return;
    }
    throw error;
  }
}

async function testSessionsEndpoint() {
  try {
    const response = await api.get('/sessions');
    if (response.status === 200 || response.status === 401) {
      return;
    }
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return;
    }
    throw error;
  }
}

async function testAnalyticsEndpoint() {
  try {
    const response = await api.get('/analytics/overview');
    if (response.status === 200 || response.status === 401) {
      return;
    }
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return;
    }
    throw error;
  }
}

async function testRegistrationEndpoint() {
  try {
    const response = await api.get('/registrations');
    if (response.status === 200 || response.status === 401) {
      return;
    }
    throw new Error(`Unexpected status: ${response.status}`);
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return;
    }
    throw error;
  }
}

async function testInvalidEndpoint() {
  try {
    const response = await api.get('/nonexistent-endpoint');
    if (response.status === 404) {
      return; // Expected 404
    }
    throw new Error(`Expected 404, got ${response.status}`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return; // Expected 404
    }
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  
  // Basic health checks
  await runTest('Health Check (/ping)', testHealthCheck);
  await runTest('Health Status (/healthz)', testHealthStatus);
  await runTest('Swagger Documentation (/docs)', testSwaggerDocs);
  
  // API endpoints (will require auth but we check they exist)
  await runTest('Conferences Endpoint', testConferencesEndpoint);
  await runTest('Attendees Endpoint', testAttendeesEndpoint);
  await runTest('Sessions Endpoint', testSessionsEndpoint);
  await runTest('Analytics Endpoint', testAnalyticsEndpoint);
  await runTest('Registrations Endpoint', testRegistrationEndpoint);
  
  // Error handling
  await runTest('404 Error Handling', testInvalidEndpoint);
  
  // Results summary
  console.log('\n📊 Test Results Summary:');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! API is working correctly.');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please check the errors above.`);
  }
  
  return testResults.failed === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner error:', error.message);
      process.exit(1);
    });
}

module.exports = { runAllTests };
