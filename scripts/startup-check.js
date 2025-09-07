const { autoUpdateJWTSecrets } = require('./generate-env');
const path = require('path');

/**
 * Kiểm tra và chuẩn bị môi trường trước khi khởi động backend
 */
function startupCheck() {
  console.log('🚀 Kiểm tra môi trường backend...');
  
  try {
    // Kiểm tra và cập nhật JWT secrets
    autoUpdateJWTSecrets();
    
    console.log('✅ Backend đã sẵn sàng khởi động');
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra môi trường:', error.message);
    return false;
  }
}

// Chạy kiểm tra nếu được gọi trực tiếp
if (require.main === module) {
  const success = startupCheck();
  process.exit(success ? 0 : 1);
}

module.exports = { startupCheck };
