# Tự động tạo JWT Secrets

Hệ thống đã được cấu hình để tự động tạo và quản lý JWT secrets mà không cần copy-paste thủ công.

## Cách hoạt động

1. **Tự động tạo file .env**: Khi khởi động server, hệ thống sẽ tự động kiểm tra và tạo file `.env` nếu chưa tồn tại
2. **JWT Secrets tự động**: Các JWT secrets sẽ được tạo ngẫu nhiên với độ dài 64 ký tự
3. **Không cần copy-paste**: Bạn không cần phải copy-paste các giá trị JWT secrets nữa

## Các lệnh sử dụng

### 1. Khởi động server với kiểm tra .env tự động
```bash
npm run start:with-env
```

### 2. Tạo file .env mới (nếu chưa tồn tại)
```bash
npm run env:generate
```

### 3. Cập nhật JWT secrets trong file .env hiện có
```bash
npm run env:update
```

### 4. Khởi động development với kiểm tra .env
```bash
npm run dev
```

## Cấu trúc file .env được tạo

File `.env` sẽ được tạo với cấu trúc sau:

```env
# Server Configuration
NODE_ENV=development
PORT=4000

# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost:1521/XE

# JWT Configuration (Auto-generated)
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=debug
```

## Lưu ý quan trọng

1. **Bảo mật**: JWT secrets được tạo ngẫu nhiên mỗi lần tạo file .env mới
2. **Production**: Trong môi trường production, hãy đảm bảo sử dụng JWT secrets cố định và bảo mật
3. **Backup**: Nếu bạn đã có JWT secrets cố định, hãy backup file .env trước khi chạy `env:update`
4. **Git**: File .env sẽ không được commit vào git (đã có trong .gitignore)

## Troubleshooting

### Lỗi "Missing required environment variables"
- Chạy `npm run env:generate` để tạo file .env
- Hoặc chạy `npm run start:with-env` để tự động tạo và khởi động

### Muốn sử dụng JWT secrets cố định
- Chỉnh sửa trực tiếp file .env sau khi tạo
- Không chạy `npm run env:update` để tránh ghi đè

### File .env bị mất
- Chạy `npm run env:generate` để tạo lại
- Hoặc copy từ `env.example` và chỉnh sửa các giá trị cần thiết
