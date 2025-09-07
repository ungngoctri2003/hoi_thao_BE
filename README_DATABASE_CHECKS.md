# Database Checks - Quick Start Guide

Hướng dẫn nhanh về tính năng kiểm tra database trong hệ thống.

## 🚀 Quick Start

### 1. Khởi động development với kiểm tra database
```bash
npm run dev
```
Server sẽ tự động kiểm tra database và hiển thị kết quả trong logs.

### 2. Kiểm tra database sau khi server đã chạy
```bash
npm run test:startup
```

### 3. Khởi động production với kiểm tra
```bash
npm run start:with-check
```

## 📋 Các Scripts Available

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Development server với database check tự động |
| `npm run dev:with-check` | Development với wrapper script |
| `npm run start:with-check` | Production server với database check |
| `npm run test:db` | Test tất cả database endpoints |
| `npm run test:startup` | Test startup database checks |

## 🔍 Database Checks

Khi khởi động server, hệ thống sẽ tự động kiểm tra:

1. **✅ Database Connection**
   - Khởi tạo connection pool
   - Test query cơ bản
   - Đo thời gian phản hồi

2. **✅ Schema Validation**
   - Kiểm tra 15 bảng cần thiết
   - Báo cáo bảng nào thiếu
   - Xác nhận schema hoàn chỉnh

3. **✅ Operations Test**
   - Test INSERT với RETURNING ID
   - Test SELECT và DELETE
   - Xác nhận ID tự động hoạt động

## 📊 Logs Mẫu

### Thành công:
```
🚀 Starting database health checks...
🔍 Checking database connection...
✅ Database connection successful {"responseTime":"45ms"}
🔍 Validating database schema...
✅ Database schema is complete {"existingTables":15}
🔍 Testing database operations...
✅ Database operations test successful
🎉 All database checks passed! System is ready.
```

### Có lỗi:
```
🚀 Starting database health checks...
🔍 Checking database connection...
❌ Database connection failed {"error":"ORA-12541: TNS:no listener"}
💥 Database connection failed. Server will start but may not work properly.
⚠️  Server started but database has issues. Please check the logs above.
```

## 🛠️ Troubleshooting

### Database không kết nối được
1. Kiểm tra Oracle database có chạy không
2. Kiểm tra biến môi trường:
   ```env
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_CONNECT_STRING=your_connection_string
   ```
3. Test connection: `sqlplus username/password@connect_string`

### Schema không đầy đủ
1. Chạy script tạo bảng
2. Kiểm tra quyền truy cập database
3. Import schema từ file DDL

### Operations test thất bại
1. Đảm bảo bảng `ROLES` tồn tại
2. Kiểm tra quyền INSERT/SELECT/DELETE
3. Kiểm tra sequence cho ID tự động

## 📚 Tài liệu chi tiết

- [STARTUP_DB_CHECK_GUIDE.md](./STARTUP_DB_CHECK_GUIDE.md) - Hướng dẫn chi tiết về startup checks
- [DATABASE_CHECK_GUIDE.md](./DATABASE_CHECK_GUIDE.md) - Hướng dẫn về các endpoint kiểm tra

## 🎯 Best Practices

1. **Luôn chạy `npm run dev` để kiểm tra database trước khi code**
2. **Xem logs cẩn thận khi khởi động server**
3. **Sửa lỗi database trước khi tiếp tục development**
4. **Sử dụng health check endpoints để monitor**
5. **Backup database trước khi thay đổi schema**

## 🔗 Health Check Endpoints

Sau khi server khởi động, có thể kiểm tra qua:

- `GET /healthz` - Basic health
- `GET /healthz/db` - Database health  
- `GET /api/v1/health` - API health
- `GET /api/v1/health/db` - Detailed database info
- `GET /api/v1/health/db/schema` - Schema validation
- `GET /api/v1/health/db/operations` - Operations test

## ⚡ Quick Commands

```bash
# Start development với database check
npm run dev

# Test database sau khi server chạy
npm run test:startup

# Test tất cả database endpoints
npm run test:db

# Start production với check
npm run start:with-check

# Help
npm run test:db -- --help
npm run start:with-check -- --help
```
