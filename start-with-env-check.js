#!/usr/bin/env node

/**
 * Script khởi động server với kiểm tra tự động file .env
 * Tự động tạo file .env với JWT secrets nếu chưa tồn tại
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Import script generate env
const { ensureEnvFile } = require('./scripts/generate-env');

console.log('🚀 Khởi động Conference Management System...');
console.log('🔍 Kiểm tra file .env...');

// Đảm bảo file .env tồn tại
try {
  ensureEnvFile();
  console.log('✅ File .env đã sẵn sàng');
} catch (error) {
  console.error('❌ Lỗi khi tạo file .env:', error.message);
  process.exit(1);
}

// Kiểm tra xem có file .env không
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ File .env không tồn tại sau khi tạo');
  process.exit(1);
}

console.log('🎯 Bắt đầu server...');

// Khởi động server
const serverProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// Xử lý tín hiệu dừng
process.on('SIGINT', () => {
  console.log('\n🛑 Đang dừng server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Đang dừng server...');
  serverProcess.kill('SIGTERM');
});

serverProcess.on('close', (code) => {
  console.log(`\n📊 Server đã dừng với mã thoát: ${code}`);
  process.exit(code);
});

serverProcess.on('error', (error) => {
  console.error('❌ Lỗi khi khởi động server:', error);
  process.exit(1);
});
