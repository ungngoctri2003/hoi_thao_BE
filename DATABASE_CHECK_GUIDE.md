# Database Connection Check Guide

Hướng dẫn kiểm tra kết nối database trước khi sử dụng hệ thống.

## Tổng quan

Hệ thống đã được cấu hình để kiểm tra kết nối database trước khi thực hiện các API create. Tất cả các API create đều sử dụng `RETURNING ID INTO :ID` để tự động sinh ID.

## Các endpoint kiểm tra

### 1. Basic Health Check
```bash
GET /healthz
```
Kiểm tra server có hoạt động không.

### 2. Database Health Check
```bash
GET /healthz/db
```
Kiểm tra kết nối database cơ bản.

### 3. API Health Check
```bash
GET /api/v1/health
```
Kiểm tra API health check.

### 4. Database Connection Test
```bash
GET /api/v1/health/db
```
Kiểm tra kết nối database chi tiết với thời gian phản hồi.

### 5. Database Schema Validation
```bash
GET /api/v1/health/db/schema
```
Kiểm tra tất cả các bảng cần thiết có tồn tại không.

### 6. Database Operations Test
```bash
GET /api/v1/health/db/operations
```
Kiểm tra các thao tác INSERT/SELECT/DELETE với RETURNING ID.

## Scripts kiểm tra

### 1. Test Database Connection
```bash
npm run test:db
```
Chạy tất cả các test kiểm tra database.

### 2. Start Server with Database Check
```bash
npm run start:with-check
```
Khởi động server và kiểm tra database trước khi bắt đầu.

## Cách sử dụng

### 1. Kiểm tra nhanh
```bash
# Kiểm tra server
curl http://localhost:4000/healthz

# Kiểm tra database
curl http://localhost:4000/healthz/db
```

### 2. Kiểm tra đầy đủ
```bash
# Chạy script test
npm run test:db

# Hoặc khởi động với kiểm tra
npm run start:with-check
```

### 3. Kiểm tra từng bước
```bash
# 1. Kiểm tra server
curl http://localhost:4000/healthz

# 2. Kiểm tra database connection
curl http://localhost:4000/api/v1/health/db

# 3. Kiểm tra schema
curl http://localhost:4000/api/v1/health/db/schema

# 4. Kiểm tra operations
curl http://localhost:4000/api/v1/health/db/operations
```

## Cấu hình Database

Đảm bảo các biến môi trường sau được cấu hình:

```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_CONNECT_STRING=your_connection_string
```

## Các bảng cần thiết

Hệ thống yêu cầu các bảng sau:

- `ATTENDEES` - Thông tin người tham dự
- `APP_USERS` - Người dùng hệ thống
- `CONFERENCES` - Hội nghị
- `SESSIONS` - Phiên họp
- `REGISTRATIONS` - Đăng ký tham dự
- `CHECKINS` - Check-in
- `MESSAGES` - Tin nhắn
- `MATCHES` - Ghép đôi networking
- `ROLES` - Vai trò
- `PERMISSIONS` - Quyền
- `USER_ROLES` - Liên kết user-role
- `ROLE_PERMISSIONS` - Liên kết role-permission
- `AUDIT_LOGS` - Nhật ký audit
- `FLOORS` - Tầng
- `ROOMS` - Phòng

## Xử lý lỗi

### Database Connection Failed
- Kiểm tra thông tin kết nối database
- Đảm bảo Oracle database đang chạy
- Kiểm tra firewall và network

### Schema Incomplete
- Chạy script tạo bảng
- Kiểm tra quyền truy cập database
- Xem log chi tiết để biết bảng nào thiếu

### Operations Test Failed
- Kiểm tra quyền INSERT/SELECT/DELETE
- Đảm bảo bảng ROLES tồn tại (dùng để test)
- Kiểm tra sequence cho ID tự động

## Monitoring

### Logs
Hệ thống sẽ ghi log chi tiết về:
- Kết nối database
- Thời gian phản hồi
- Lỗi kết nối
- Schema validation

### Metrics
Có thể monitor qua:
- `/metrics` endpoint
- Health check endpoints
- Application logs

## Best Practices

1. **Luôn kiểm tra database trước khi deploy**
2. **Sử dụng health check trong monitoring**
3. **Thiết lập alert khi database down**
4. **Test thường xuyên trong development**
5. **Backup database trước khi thay đổi schema**

## Troubleshooting

### Lỗi thường gặp

1. **ORA-12541: TNS:no listener**
   - Oracle database không chạy
   - Kiểm tra service Oracle

2. **ORA-01017: invalid username/password**
   - Sai thông tin đăng nhập
   - Kiểm tra biến môi trường

3. **ORA-00942: table or view does not exist**
   - Thiếu bảng trong database
   - Chạy script tạo bảng

4. **Connection timeout**
   - Network issue
   - Database overload
   - Firewall blocking

### Debug Commands

```bash
# Kiểm tra Oracle service
systemctl status oracle

# Kiểm tra listener
lsnrctl status

# Test connection từ Oracle client
sqlplus username/password@connect_string

# Kiểm tra tables
sqlplus username/password@connect_string
SQL> SELECT table_name FROM user_tables;
```
