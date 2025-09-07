const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Environment Setup\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created!');
  } else {
    console.log('❌ env.example file not found!');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if Firebase variables are already set
const firebaseVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID'
];

console.log('\n🔍 Checking Firebase environment variables...');

let needsFirebaseConfig = false;
firebaseVars.forEach(varName => {
  if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your_`)) {
    console.log(`❌ ${varName}: Not configured`);
    needsFirebaseConfig = true;
  } else {
    console.log(`✅ ${varName}: Configured`);
  }
});

if (needsFirebaseConfig) {
  console.log('\n📋 Firebase configuration needed!');
  console.log('\nTo configure Firebase Admin SDK:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
  console.log('2. Select your project');
  console.log('3. Go to Project Settings > Service Accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Download the JSON file');
  console.log('6. Extract values and add to .env file:');
  console.log('\n   FIREBASE_PROJECT_ID=your-project-id');
  console.log('   FIREBASE_PRIVATE_KEY_ID=your-private-key-id');
  console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY\\n-----END PRIVATE KEY-----\\n"');
  console.log('   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com');
  console.log('   FIREBASE_CLIENT_ID=your-client-id');
  
  console.log('\n📄 See firebase-env-example.txt for detailed instructions');
  
  // Add Firebase variables to .env if they don't exist
  if (!envContent.includes('FIREBASE_PROJECT_ID=')) {
    envContent += '\n# Firebase Admin SDK Configuration\n';
    envContent += 'FIREBASE_PROJECT_ID=your-firebase-project-id\n';
    envContent += 'FIREBASE_PRIVATE_KEY_ID=your-private-key-id\n';
    envContent += 'FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----\\n"\n';
    envContent += 'FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com\n';
    envContent += 'FIREBASE_CLIENT_ID=your-client-id\n';
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Added Firebase variables to .env file');
  }
} else {
  console.log('\n🎉 Firebase configuration is complete!');
}

console.log('\n🧪 To test Firebase configuration, run:');
console.log('   node test-firebase-config.js');
