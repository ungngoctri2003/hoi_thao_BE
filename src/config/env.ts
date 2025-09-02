import dotenv from 'dotenv';
const { ensureEnvFile } = require('../../scripts/generate-env');

// Đảm bảo file .env tồn tại trước khi load
ensureEnvFile();

dotenv.config();

// Environment validation
function validateEnv() {
  const requiredVars = [
    'DB_USER',
    'DB_PASSWORD', 
    'DB_CONNECT_STRING',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secrets are not default values
  if (process.env.JWT_ACCESS_SECRET?.includes('change_in_production') || 
      process.env.JWT_REFRESH_SECRET?.includes('change_in_production')) {
    console.warn('⚠️  WARNING: Using default JWT secrets. Change them in production!');
  }
}

// Only validate in production or when explicitly requested
if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') {
  validateEnv();
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  db: {
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    connectString: process.env.DB_CONNECT_STRING!
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d'
  }
};




