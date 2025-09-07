# Startup Database Check Guide

Hướng dẫn sử dụng tính năng kiểm tra database khi khởi động server.

## Tổng quan

Hệ thống đã được cấu hình để tự động kiểm tra kết nối database khi khởi động server. Khi chạy `npm run dev`, server sẽ:

1. ✅ Kiểm tra kết nối database
2. ✅ Xác thực schema database
3. ✅ Test các thao tác database (INSERT/SELECT/DELETE với RETURNING ID)
4. ✅ Hiển thị kết quả trong logs

## Cách sử dụng

### 1. Development với kiểm tra database (Khuyến nghị)

```bash
npm run dev
```

Server sẽ tự động thực hiện các kiểm tra database và hiển thị kết quả trong logs.

### 2. Development với wrapper script

```bash
npm run dev:with-check
```

Sử dụng script wrapper để có thêm thông tin về quá trình khởi động.

### 3. Production với kiểm tra database

```bash
npm run start:with-check
```

Khởi động server production với kiểm tra database.

## Logs mẫu

### Khi database kết nối thành công:

```
🚀 Starting database health checks...
🔍 Checking database connection...
✅ Database connection successful {"responseTime":"45ms","serverTime":"2024-01-15T10:30:00.000Z"}
🔍 Validating database schema...
✅ Database schema is complete {"existingTables":15,"totalRequired":15}
🔍 Testing database operations...
✅ Database operations test successful {"testId":123}
🎉 All database checks passed! System is ready.
Server started successfully {"port":4000,"databaseStatus":"ready"}
🚀 Conference Management System is ready to use!
```

### Khi database có vấn đề:

```
🚀 Starting database health checks...
🔍 Checking database connection...
❌ Database connection failed {"error":"ORA-12541: TNS:no listener"}
💥 Database connection failed. Server will start but may not work properly.
Server started successfully {"port":4000,"databaseStatus":"issues_detected"}
⚠️  Server started but database has issues. Please check the logs above.
```

### Khi schema không đầy đủ:

```
🚀 Starting database health checks...
🔍 Checking database connection...
✅ Database connection successful {"responseTime":"45ms","serverTime":"2024-01-15T10:30:00.000Z"}
🔍 Validating database schema...
⚠️  Database schema is incomplete {"existingTables":10,"missingTables":["ATTENDEES","CONFERENCES","SESSIONS","REGISTRATIONS","CHECKINS"],"totalRequired":15}
⚠️  Database schema is incomplete. Some features may not work.
🔍 Testing database operations...
❌ Database operations test failed {"error":"ORA-00942: table or view does not exist"}
⚠️  Database operations test failed. Some features may not work.
⚠️  Some database checks failed. Please review the logs above.
Server started successfully {"port":4000,"databaseStatus":"issues_detected"}
⚠️  Server started but database has issues. Please check the logs above.
```

## Các kiểm tra được thực hiện

### 1. Database Connection Test
- Khởi tạo connection pool
- Thực hiện query test: `SELECT 1 as test, SYSTIMESTAMP as server_time FROM DUAL`
- Đo thời gian phản hồi
- Kiểm tra kết quả trả về

### 2. Schema Validation
- Kiểm tra tất cả 15 bảng cần thiết:
  - `ATTENDEES`, `APP_USERS`, `CONFERENCES`, `SESSIONS`
  - `REGISTRATIONS`, `CHECKINS`, `MESSAGES`, `MATCHES`
  - `ROLES`, `PERMISSIONS`, `USER_ROLES`, `ROLE_PERMISSIONS`
  - `AUDIT_LOGS`, `FLOORS`, `ROOMS`
- Báo cáo bảng nào thiếu

### 3. Operations Test
- Test INSERT với `RETURNING ID INTO :ID`
- Test SELECT để lấy dữ liệu vừa insert
- Test DELETE để dọn dẹp
- Xác nhận tất cả thao tác hoạt động

## Xử lý lỗi

### Database Connection Failed
```
❌ Database connection failed {"error":"ORA-12541: TNS:no listener"}
```
**Giải pháp:**
- Kiểm tra Oracle database có đang chạy không
- Kiểm tra listener: `lsnrctl status`
- Kiểm tra biến môi trường database

### Schema Incomplete
```
⚠️  Database schema is incomplete {"missingTables":["ATTENDEES","CONFERENCES"]}
```
**Giải pháp:**
- Chạy script tạo bảng
- Kiểm tra quyền truy cập database
- Import schema từ file DDL

### Operations Test Failed
```
❌ Database operations test failed {"error":"ORA-00942: table or view does not exist"}
```
**Giải pháp:**
- Đảm bảo bảng `ROLES` tồn tại (dùng để test)
- Kiểm tra quyền INSERT/SELECT/DELETE
- Kiểm tra sequence cho ID tự động

## Cấu hình

### Environment Variables
```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_CONNECT_STRING=your_connection_string
NODE_ENV=development
```

### Logging Level
Trong development, logs sẽ hiển thị chi tiết. Trong production, chỉ hiển thị lỗi quan trọng.

## Best Practices

1. **Luôn chạy `npm run dev` để kiểm tra database trước khi code**
2. **Xem logs cẩn thận khi khởi động server**
3. **Sửa lỗi database trước khi tiếp tục development**
4. **Backup database trước khi thay đổi schema**
5. **Test thường xuyên trong development**

## Troubleshooting

### Server không khởi động
- Kiểm tra port có bị chiếm không
- Kiểm tra biến môi trường
- Xem logs chi tiết

### Database check chậm
- Kiểm tra network connection
- Kiểm tra database performance
- Tăng timeout nếu cần

### Hot reload không hoạt động
- Kiểm tra ts-node-dev
- Restart server
- Clear cache

## Monitoring

### Health Check Endpoints
Sau khi server khởi động, có thể kiểm tra qua:
- `GET /healthz` - Basic health
- `GET /healthz/db` - Database health
- `GET /api/v1/health/db` - Detailed database info

### Logs
- Tất cả logs được ghi vào console
- Có thể redirect vào file nếu cần
- Sử dụng structured logging với JSON format
