/**
 * Firebase Private Key Validator and Formatter
 * Handles proper formatting and validation of Firebase service account private keys
 */

export interface FirebaseKeyValidationResult {
  isValid: boolean;
  formattedKey?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Validates and formats a Firebase private key
 * @param privateKey - The raw private key from environment variable
 * @returns Validation result with formatted key if valid
 */
export function validateAndFormatFirebaseKey(privateKey: string): FirebaseKeyValidationResult {
  if (!privateKey) {
    return {
      isValid: false,
      error: 'Private key is empty or undefined',
      suggestions: ['Make sure FIREBASE_PRIVATE_KEY is set in your .env file']
    };
  }

  // Remove any existing quotes and trim whitespace
  let cleanKey = privateKey.trim().replace(/^["']|["']$/g, '');

  // Check if key already has proper PEM format
  if (cleanKey.includes('-----BEGIN PRIVATE KEY-----') && cleanKey.includes('-----END PRIVATE KEY-----')) {
    // Key is already in PEM format, just need to handle newlines
    const formattedKey = cleanKey.replace(/\\n/g, '\n');
    
    if (isValidPEMFormat(formattedKey)) {
      return {
        isValid: true,
        formattedKey
      };
    } else {
      return {
        isValid: false,
        error: 'Private key has PEM headers but invalid format',
        suggestions: [
          'Check if the private key content between headers is valid',
          'Ensure no extra characters or corrupted data'
        ]
      };
    }
  }

  // Key doesn't have PEM headers, try to add them
  if (cleanKey.length > 100) { // Basic length check for a valid private key
    const formattedKey = `-----BEGIN PRIVATE KEY-----\n${cleanKey}\n-----END PRIVATE KEY-----`;
    
    if (isValidPEMFormat(formattedKey)) {
      return {
        isValid: true,
        formattedKey
      };
    }
  }

  return {
    isValid: false,
    error: 'Invalid private key format',
    suggestions: [
      'Ensure the private key is properly formatted with PEM headers',
      'Check that newlines are escaped as \\n in the environment variable',
      'Verify the private key was copied correctly from Firebase Console',
      'Make sure there are no extra spaces or characters'
    ]
  };
}

/**
 * Validates if a string is in proper PEM format
 * @param key - The key to validate
 * @returns True if valid PEM format
 */
function isValidPEMFormat(key: string): boolean {
  const pemRegex = /-----BEGIN PRIVATE KEY-----\n([A-Za-z0-9+/=\s]+)\n-----END PRIVATE KEY-----/;
  return pemRegex.test(key);
}

/**
 * Sanitizes a private key for logging (hides sensitive content)
 * @param privateKey - The private key to sanitize
 * @returns Sanitized version safe for logging
 */
export function sanitizePrivateKeyForLogging(privateKey: string): string {
  if (!privateKey) return 'Not set';
  
  const cleanKey = privateKey.trim().replace(/^["']|["']$/g, '');
  
  if (cleanKey.length < 20) {
    return 'Too short to be valid';
  }
  
  // Show first and last few characters
  const start = cleanKey.substring(0, 10);
  const end = cleanKey.substring(cleanKey.length - 10);
  const middle = '...'.repeat(Math.min(3, Math.floor(cleanKey.length / 20)));
  
  return `${start}${middle}${end}`;
}

/**
 * Provides detailed error analysis for Firebase configuration issues
 * @param error - The error object from Firebase initialization
 * @returns Detailed error analysis and suggestions
 */
export function analyzeFirebaseError(error: any): {
  type: string;
  message: string;
  suggestions: string[];
} {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  if (errorMessage.includes('Invalid PEM formatted message')) {
    return {
      type: 'PEM_FORMAT_ERROR',
      message: 'The private key is not in valid PEM format',
      suggestions: [
        'Check that the private key has proper -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- headers',
        'Ensure newlines are properly escaped as \\n in the .env file',
        'Verify the private key was copied correctly from Firebase Console',
        'Try regenerating the service account key from Firebase Console'
      ]
    };
  }
  
  if (errorMessage.includes('project_id')) {
    return {
      type: 'PROJECT_ID_ERROR',
      message: 'Invalid or missing project ID',
      suggestions: [
        'Verify FIREBASE_PROJECT_ID is set correctly in .env file',
        'Check that the project ID matches your Firebase project'
      ]
    };
  }
  
  if (errorMessage.includes('client_email')) {
    return {
      type: 'CLIENT_EMAIL_ERROR',
      message: 'Invalid or missing client email',
      suggestions: [
        'Verify FIREBASE_CLIENT_EMAIL is set correctly in .env file',
        'Ensure the email matches your service account email from Firebase Console'
      ]
    };
  }
  
  if (errorMessage.includes('private_key_id')) {
    return {
      type: 'PRIVATE_KEY_ID_ERROR',
      message: 'Invalid or missing private key ID',
      suggestions: [
        'Verify FIREBASE_PRIVATE_KEY_ID is set correctly in .env file',
        'Check that the key ID matches the one from your service account JSON'
      ]
    };
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    message: errorMessage,
    suggestions: [
      'Check all Firebase environment variables are set correctly',
      'Verify the service account has proper permissions',
      'Try regenerating the service account key from Firebase Console',
      'Check the Firebase project is active and accessible'
    ]
  };
}
