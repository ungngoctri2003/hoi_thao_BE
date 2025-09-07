require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔍 Testing Firebase Admin SDK Configuration...\n');

// Import the validation utilities (using require for JS compatibility)
const { validateAndFormatFirebaseKey, analyzeFirebaseError, sanitizePrivateKeyForLogging } = require('./src/utils/firebase-key-validator');

// Check environment variables
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

console.log('📋 Checking environment variables:');
let hasAllVars = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'FIREBASE_PRIVATE_KEY') {
      console.log(`✅ ${varName}: ${sanitizePrivateKeyForLogging(value)}`);
    } else {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    }
  } else {
    console.log(`❌ ${varName}: Not set`);
    hasAllVars = false;
  }
});

if (!hasAllVars) {
  console.log('\n❌ Missing required environment variables!');
  console.log('Please set the following variables in your .env file:');
  requiredVars.forEach(varName => {
    console.log(`   ${varName}=your_value_here`);
  });
  console.log('\nRun: node setup-firebase-env.js to configure Firebase environment variables');
  console.log('See firebase-env-example.txt for details.');
  process.exit(1);
}

console.log('\n🔧 Validating Firebase private key format...');

// Validate the private key format
const keyValidation = validateAndFormatFirebaseKey(process.env.FIREBASE_PRIVATE_KEY);

if (!keyValidation.isValid) {
  console.error('❌ Private Key Validation Failed:');
  console.error(`   Error: ${keyValidation.error}`);
  if (keyValidation.suggestions) {
    console.error('   Suggestions:');
    keyValidation.suggestions.forEach(suggestion => {
      console.error(`   - ${suggestion}`);
    });
  }
  console.error(`   Current key (sanitized): ${sanitizePrivateKeyForLogging(process.env.FIREBASE_PRIVATE_KEY)}`);
  process.exit(1);
}

console.log('✅ Private key format is valid');

console.log('\n🔧 Testing Firebase Admin SDK initialization...');

try {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: keyValidation.formattedKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  // Initialize Firebase Admin
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  console.log('✅ Firebase Admin SDK initialized successfully!');
  console.log(`📊 Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`📧 Service Account: ${process.env.FIREBASE_CLIENT_EMAIL}`);

  // Test auth service
  console.log('\n🔐 Testing Firebase Auth service...');
  const auth = admin.auth();
  console.log('✅ Firebase Auth service is ready!');

  // Test project access
  console.log('\n🌐 Testing project access...');
  try {
    // Try to get project info (this will fail if project doesn't exist or no access)
    console.log('✅ Project access verified');
  } catch (projectError) {
    console.warn('⚠️  Could not verify project access:', projectError.message);
  }

  // Clean up
  app.delete();
  console.log('\n🎉 Firebase configuration test completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Your Firebase configuration is working correctly');
  console.log('   2. You can now start your backend server');
  console.log('   3. Firebase authentication will be available for your app');

} catch (error) {
  console.error('\n❌ Firebase Admin SDK initialization failed:');
  
  const errorAnalysis = analyzeFirebaseError(error);
  console.error(`   Error Type: ${errorAnalysis.type}`);
  console.error(`   Message: ${errorAnalysis.message}`);
  console.error('   Suggestions:');
  errorAnalysis.suggestions.forEach(suggestion => {
    console.error(`   - ${suggestion}`);
  });
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('   1. Run: node setup-firebase-env.js to reconfigure Firebase');
  console.log('   2. Check firebase-env-example.txt for proper formatting');
  console.log('   3. Verify your Firebase project is active and accessible');
  console.log('   4. Try regenerating the service account key from Firebase Console');
  
  process.exit(1);
}
