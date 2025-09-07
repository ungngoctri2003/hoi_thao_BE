const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Tự động tạo file .env với JWT secrets được generate ngẫu nhiên
 */
function generateJWTSecrets() {
  // Tạo JWT secrets ngẫu nhiên với độ dài 64 ký tự
  const accessSecret = crypto.randomBytes(32).toString('hex');
  const refreshSecret = crypto.randomBytes(32).toString('hex');
  
  return { accessSecret, refreshSecret };
}

/**
 * Tạo nội dung file .env từ template
 */
function createEnvContent(accessSecret, refreshSecret) {
  return `# Server Configuration
NODE_ENV=development
PORT=4000

# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost:1521/XE

# JWT Configuration (Auto-generated)
JWT_ACCESS_SECRET=${accessSecret}
JWT_REFRESH_SECRET=${refreshSecret}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug
`;
}

/**
 * Kiểm tra và tạo file .env nếu chưa tồn tại
 */
function ensureEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  
  // Nếu file .env đã tồn tại, không làm gì
  if (fs.existsSync(envPath)) {
    console.log('✅ File .env đã tồn tại');
    return;
  }
  
  console.log('🔧 Tạo file .env mới...');
  
  // Tạo JWT secrets mới
  const { accessSecret, refreshSecret } = generateJWTSecrets();
  
  // Tạo nội dung file .env
  const envContent = createEnvContent(accessSecret, refreshSecret);
  
  // Ghi file .env
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Đã tạo file .env với JWT secrets mới');
  console.log('🔑 JWT_ACCESS_SECRET:', accessSecret.substring(0, 8) + '...');
  console.log('🔑 JWT_REFRESH_SECRET:', refreshSecret.substring(0, 8) + '...');
  console.log('⚠️  Lưu ý: Các secrets này sẽ được tạo mới mỗi lần chạy script nếu file .env không tồn tại');
}

/**
 * Cập nhật JWT secrets trong file .env hiện có
 */
function updateJWTSecrets() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ File .env không tồn tại. Chạy ensureEnvFile() trước.');
    return;
  }
  
  console.log('🔄 Cập nhật JWT secrets...');
  
  // Đọc file .env hiện tại
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Tạo JWT secrets mới
  const { accessSecret, refreshSecret } = generateJWTSecrets();
  
  // Cập nhật JWT secrets
  envContent = envContent.replace(
    /JWT_ACCESS_SECRET=.*/,
    `JWT_ACCESS_SECRET=${accessSecret}`
  );
  envContent = envContent.replace(
    /JWT_REFRESH_SECRET=.*/,
    `JWT_REFRESH_SECRET=${refreshSecret}`
  );
  
  // Ghi lại file
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Đã cập nhật JWT secrets');
  console.log('🔑 JWT_ACCESS_SECRET:', accessSecret.substring(0, 8) + '...');
  console.log('🔑 JWT_REFRESH_SECRET:', refreshSecret.substring(0, 8) + '...');
}

/**
 * Kiểm tra và tự động cập nhật JWT secrets nếu chúng không an toàn
 */
function checkAndUpdateUnsafeSecrets() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ File .env không tồn tại. Chạy ensureEnvFile() trước.');
    return false;
  }
  
  // Đọc file .env hiện tại
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Kiểm tra xem có JWT secrets không an toàn không
  const hasUnsafeAccessSecret = envContent.includes('JWT_ACCESS_SECRET=your_super_secret_access_key_here_change_in_production');
  const hasUnsafeRefreshSecret = envContent.includes('JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_change_in_production');
  
  if (hasUnsafeAccessSecret || hasUnsafeRefreshSecret) {
    console.log('⚠️  Phát hiện JWT secrets không an toàn!');
    console.log('🔄 Tự động cập nhật JWT secrets...');
    updateJWTSecrets();
    return true;
  }
  
  console.log('✅ JWT secrets đã an toàn');
  return false;
}

/**
 * Tự động cập nhật JWT secrets mỗi khi khởi động ứng dụng
 */
function autoUpdateJWTSecrets() {
  console.log('🔍 Kiểm tra JWT secrets...');
  
  // Kiểm tra và cập nhật nếu cần
  const wasUpdated = checkAndUpdateUnsafeSecrets();
  
  if (wasUpdated) {
    console.log('🔄 JWT secrets đã được cập nhật tự động');
  } else {
    console.log('✅ JWT secrets đã sẵn sàng');
  }
}

// Chạy script
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'update':
      updateJWTSecrets();
      break;
    case 'check':
      checkAndUpdateUnsafeSecrets();
      break;
    case 'auto':
      autoUpdateJWTSecrets();
      break;
    case 'ensure':
    default:
      ensureEnvFile();
      break;
  }
}

module.exports = {
  generateJWTSecrets,
  createEnvContent,
  ensureEnvFile,
  updateJWTSecrets,
  checkAndUpdateUnsafeSecrets,
  autoUpdateJWTSecrets
};
