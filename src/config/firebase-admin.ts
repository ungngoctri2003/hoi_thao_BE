import admin from 'firebase-admin';
import { validateAndFormatFirebaseKey, analyzeFirebaseError, sanitizePrivateKeyForLogging } from '../utils/firebase-key-validator';

// Check if Firebase environment variables are set
const hasFirebaseConfig = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY_ID && 
                         process.env.FIREBASE_PRIVATE_KEY && 
                         process.env.FIREBASE_CLIENT_EMAIL;

let firebaseAdmin: admin.app.App | null = null;

if (hasFirebaseConfig) {
  try {
    // Validate and format the private key
    const keyValidation = validateAndFormatFirebaseKey(process.env.FIREBASE_PRIVATE_KEY!);
    
    if (!keyValidation.isValid) {
      console.error('❌ Firebase Private Key Validation Failed:');
      console.error(`   Error: ${keyValidation.error}`);
      if (keyValidation.suggestions) {
        console.error('   Suggestions:');
        keyValidation.suggestions.forEach(suggestion => {
          console.error(`   - ${suggestion}`);
        });
      }
      console.error(`   Current key (sanitized): ${sanitizePrivateKeyForLogging(process.env.FIREBASE_PRIVATE_KEY!)}`);
      firebaseAdmin = null;
    } else {
      // Khởi tạo Firebase Admin SDK với key đã được validate
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID!,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID!,
        private_key: keyValidation.formattedKey!,
        client_email: process.env.FIREBASE_CLIENT_EMAIL!,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };

      if (!admin.apps.length) {
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log('✅ Firebase Admin SDK initialized successfully');
        console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
        console.log(`   Service Account: ${process.env.FIREBASE_CLIENT_EMAIL}`);
      } else {
        firebaseAdmin = admin.app();
        console.log('✅ Firebase Admin SDK already initialized');
      }
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:');
    
    const errorAnalysis = analyzeFirebaseError(error);
    console.error(`   Error Type: ${errorAnalysis.type}`);
    console.error(`   Message: ${errorAnalysis.message}`);
    console.error('   Suggestions:');
    errorAnalysis.suggestions.forEach(suggestion => {
      console.error(`   - ${suggestion}`);
    });
    
    // Log environment variables for debugging (sanitized)
    console.error('\n   Environment Variables Status:');
    console.error(`   FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing'}`);
    console.error(`   FIREBASE_PRIVATE_KEY_ID: ${process.env.FIREBASE_PRIVATE_KEY_ID ? '✅ Set' : '❌ Missing'}`);
    console.error(`   FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? `✅ Set (${sanitizePrivateKeyForLogging(process.env.FIREBASE_PRIVATE_KEY)})` : '❌ Missing'}`);
    console.error(`   FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing'}`);
    console.error(`   FIREBASE_CLIENT_ID: ${process.env.FIREBASE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    
    firebaseAdmin = null;
  }
} else {
  console.warn('⚠️ Firebase Admin SDK not initialized - missing environment variables');
  console.warn('Required variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
  console.warn('Run: node setup-firebase-env.js to configure Firebase environment variables');
}

export { firebaseAdmin };
