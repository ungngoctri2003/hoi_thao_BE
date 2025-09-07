const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Kiểm tra bảo mật JWT secrets
 */
function checkJWTSecurity() {
  console.log('🔒 Kiểm tra bảo mật JWT secrets...');
  
  const issues = [];
  const warnings = [];
  
  // Kiểm tra file .env backend
  const backendEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(backendEnvPath)) {
    const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    
    // Kiểm tra JWT secrets không an toàn
    if (backendEnv.includes('JWT_ACCESS_SECRET=your_super_secret_access_key_here_change_in_production')) {
      issues.push('❌ Backend: JWT_ACCESS_SECRET vẫn sử dụng giá trị mặc định không an toàn');
    }
    
    if (backendEnv.includes('JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_change_in_production')) {
      issues.push('❌ Backend: JWT_REFRESH_SECRET vẫn sử dụng giá trị mặc định không an toàn');
    }
    
    // Kiểm tra độ dài JWT secrets
    const accessMatch = backendEnv.match(/JWT_ACCESS_SECRET=(.+)/);
    const refreshMatch = backendEnv.match(/JWT_REFRESH_SECRET=(.+)/);
    
    if (accessMatch && accessMatch[1].length < 32) {
      warnings.push('⚠️  Backend: JWT_ACCESS_SECRET quá ngắn (nên >= 32 ký tự)');
    }
    
    if (refreshMatch && refreshMatch[1].length < 32) {
      warnings.push('⚠️  Backend: JWT_REFRESH_SECRET quá ngắn (nên >= 32 ký tự)');
    }
    
    // Kiểm tra JWT secrets có giống nhau không
    if (accessMatch && refreshMatch && accessMatch[1] === refreshMatch[1]) {
      issues.push('❌ Backend: JWT_ACCESS_SECRET và JWT_REFRESH_SECRET giống nhau (không an toàn)');
    }
    
    // Kiểm tra JWT secrets có đủ phức tạp không
    if (accessMatch && !isStrongSecret(accessMatch[1])) {
      warnings.push('⚠️  Backend: JWT_ACCESS_SECRET không đủ phức tạp');
    }
    
    if (refreshMatch && !isStrongSecret(refreshMatch[1])) {
      warnings.push('⚠️  Backend: JWT_REFRESH_SECRET không đủ phức tạp');
    }
  } else {
    warnings.push('⚠️  Backend: File .env không tồn tại');
  }
  
  // Hiển thị kết quả
  console.log('\n📊 KẾT QUẢ KIỂM TRA BẢO MẬT:');
  console.log('=' .repeat(50));
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ Tất cả JWT secrets đều an toàn!');
  } else {
    if (issues.length > 0) {
      console.log('\n🚨 VẤN ĐỀ NGHIÊM TRỌNG:');
      issues.forEach(issue => console.log(issue));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  CẢNH BÁO:');
      warnings.forEach(warning => console.log(warning));
    }
  }
  
  console.log('\n💡 KHUYẾN NGHỊ:');
  console.log('- Chạy "npm run env:update" để tạo JWT secrets mới');
  console.log('- Không bao giờ commit file .env vào git');
  console.log('- Sử dụng JWT secrets khác nhau cho môi trường development và production');
  console.log('- JWT secrets nên có ít nhất 32 ký tự và chứa ký tự đặc biệt');
  
  return {
    hasIssues: issues.length > 0,
    hasWarnings: warnings.length > 0,
    issues,
    warnings
  };
}

/**
 * Kiểm tra độ mạnh của secret
 */
function isStrongSecret(secret) {
  if (secret.length < 32) return false;
  
  // Kiểm tra có chứa ký tự đặc biệt, số, chữ cái
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
  const hasNumber = /\d/.test(secret);
  const hasLetter = /[a-zA-Z]/.test(secret);
  
  return hasSpecial && hasNumber && hasLetter;
}

/**
 * Tự động sửa các vấn đề bảo mật
 */
function autoFixSecurityIssues() {
  console.log('🔧 Tự động sửa các vấn đề bảo mật...');
  
  const { autoUpdateJWTSecrets } = require('./generate-env');
  
  try {
    // Cập nhật JWT secrets
    autoUpdateJWTSecrets();
    
    console.log('✅ Đã tự động sửa các vấn đề bảo mật');
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi tự động sửa:', error.message);
    return false;
  }
}

// Chạy script
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'fix':
      autoFixSecurityIssues();
      break;
    case 'check':
    default:
      checkJWTSecurity();
      break;
  }
}

module.exports = {
  checkJWTSecurity,
  autoFixSecurityIssues
};
