const admin = require('firebase-admin');

console.log('🔍 Testing Firebase Admin SDK Configuration...\n');

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
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
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
  console.log('\nSee firebase-env-example.txt for details.');
  process.exit(1);
}

console.log('\n🔧 Testing Firebase Admin SDK initialization...');

try {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

  // Clean up
  app.delete();
  console.log('\n🎉 Firebase configuration test completed successfully!');

} catch (error) {
  console.error('\n❌ Firebase Admin SDK initialization failed:');
  console.error(error.message);
  
  if (error.message.includes('project_id')) {
    console.log('\n💡 Tip: Make sure FIREBASE_PROJECT_ID is set correctly');
  } else if (error.message.includes('private_key')) {
    console.log('\n💡 Tip: Make sure FIREBASE_PRIVATE_KEY is properly formatted with \\n');
  } else if (error.message.includes('client_email')) {
    console.log('\n💡 Tip: Make sure FIREBASE_CLIENT_EMAIL is the correct service account email');
  }
  
  process.exit(1);
}
