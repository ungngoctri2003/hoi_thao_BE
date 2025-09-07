# 📚 Swagger API Documentation Guide

## 🚀 Truy cập Swagger UI

Sau khi chạy server, bạn có thể truy cập Swagger UI tại:

```
http://localhost:4000/docs
```

## 📋 Danh sách các Module đã được document

### ✅ **Authentication & Authorization**
- **POST** `/auth/login` - Đăng nhập
- **POST** `/auth/register` - Đăng ký tài khoản
- **POST** `/auth/refresh` - Làm mới token
- **POST** `/auth/forgot-password` - Quên mật khẩu
- **POST** `/auth/reset-password` - Đặt lại mật khẩu

### ✅ **Conference Management**
- **GET** `/conferences` - Danh sách hội nghị
- **POST** `/conferences` - Tạo hội nghị mới
- **GET** `/conferences/{id}` - Chi tiết hội nghị
- **PATCH** `/conferences/{id}` - Cập nhật hội nghị
- **DELETE** `/conferences/{id}` - Xóa hội nghị
- **PATCH** `/conferences/{id}/status` - Thay đổi trạng thái

### ✅ **Session Management**
- **GET** `/sessions` - Danh sách phiên họp
- **POST** `/sessions` - Tạo phiên họp mới
- **GET** `/sessions/{id}` - Chi tiết phiên họp
- **PATCH** `/sessions/{id}` - Cập nhật phiên họp
- **DELETE** `/sessions/{id}` - Xóa phiên họp

### ✅ **Attendee Management**
- **GET** `/attendees` - Danh sách người tham dự
- **POST** `/attendees` - Tạo người tham dự mới
- **GET** `/attendees/{id}` - Chi tiết người tham dự
- **PATCH** `/attendees/{id}` - Cập nhật thông tin
- **DELETE** `/attendees/{id}` - Xóa người tham dự

### ✅ **Registration Management**
- **GET** `/registrations` - Danh sách đăng ký
- **POST** `/registrations` - Đăng ký hội nghị
- **GET** `/registrations/{id}` - Chi tiết đăng ký
- **DELETE** `/registrations/{id}` - Hủy đăng ký

### ✅ **Check-in Management**
- **GET** `/checkins` - Danh sách check-in
- **POST** `/checkins` - Thực hiện check-in

### ✅ **Analytics & Reporting**
- **GET** `/analytics/overview` - Tổng quan thống kê
- **GET** `/analytics/conferences/{id}/attendance` - Thống kê tham dự hội nghị
- **GET** `/analytics/sessions/{id}/engagement` - Thống kê tương tác phiên họp
- **GET** `/analytics/networking` - Thống kê networking

### ✅ **Badge & Achievement System**
- **GET** `/badges/{attendeeId}` - Huy hiệu của người tham dự

### ✅ **Certificate Generation**
- **POST** `/certificates/generate` - Tạo chứng chỉ

### ✅ **Real-time Messaging**
- **GET** `/messages` - Danh sách tin nhắn
- **POST** `/messages` - Gửi tin nhắn

### ✅ **Networking & Matching**
- **GET** `/matches` - Danh sách kết nối
- **POST** `/matches` - Tạo kết nối mới

### ✅ **User Profile Management**
- **GET** `/profile` - Thông tin profile
- **PATCH** `/profile` - Cập nhật profile

### ✅ **System Settings**
- **GET** `/settings` - Cài đặt hệ thống
- **PATCH** `/settings` - Cập nhật cài đặt

### ✅ **User Management**
- **GET** `/users` - Danh sách người dùng
- **GET** `/users/{id}` - Chi tiết người dùng
- **PATCH** `/users/{id}` - Cập nhật người dùng

### ✅ **Role-Based Access Control**
- **GET** `/roles` - Danh sách vai trò
- **POST** `/roles` - Tạo vai trò mới
- **GET** `/permissions` - Danh sách quyền
- **POST** `/permissions` - Tạo quyền mới

### ✅ **Audit Logging**
- **GET** `/audit` - Lịch sử hoạt động

### ✅ **Health Check**
- **GET** `/ping` - Kiểm tra sức khỏe API
- **GET** `/healthz` - Kiểm tra trạng thái server

## 🔐 Authentication

Hầu hết các endpoint đều yêu cầu authentication. Sử dụng Bearer Token:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Response Format

Tất cả API responses đều tuân theo format chuẩn:

### ✅ Success Response
```json
{
  "data": {
    // Response data here
  },
  "meta": {
    // Pagination info (if applicable)
  }
}
```

### ❌ Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Field specific error"
      }
    ]
  }
}
```

## 🎯 Common Error Codes

- `VALIDATION_ERROR` - Dữ liệu đầu vào không hợp lệ
- `UNAUTHORIZED` - Chưa đăng nhập hoặc token không hợp lệ
- `FORBIDDEN` - Không có quyền truy cập
- `NOT_FOUND` - Không tìm thấy resource
- `INTERNAL_ERROR` - Lỗi server

## 📝 Pagination

Các endpoint list đều hỗ trợ pagination:

- `page` - Số trang (default: 1)
- `limit` - Số item mỗi trang (default: 10, max: 100)

## 🔍 Filtering & Search

Nhiều endpoint hỗ trợ filtering và search:

- `search` - Tìm kiếm theo từ khóa
- `status` - Lọc theo trạng thái
- `category` - Lọc theo danh mục
- `conferenceId` - Lọc theo hội nghị
- `attendeeId` - Lọc theo người tham dự

## 🚀 Cách sử dụng

1. **Khởi động server:**
   ```bash
   npm run dev
   ```

2. **Truy cập Swagger UI:**
   ```
   http://localhost:4000/docs
   ```

3. **Test API:**
   - Click vào endpoint muốn test
   - Click "Try it out"
   - Điền thông tin cần thiết
   - Click "Execute"

4. **Authentication:**
   - Đăng nhập để lấy token
   - Click "Authorize" ở đầu trang
   - Nhập: `Bearer <your-token>`

## 📈 Thống kê

- **Total Endpoints:** 32
- **Total Schemas:** 67
- **Modules Covered:** 18
- **Authentication:** JWT Bearer Token
- **Response Format:** JSON
- **API Version:** v1

## 🎉 Hoàn thành!

Swagger documentation đã được tạo đầy đủ cho tất cả các module trong hệ thống Conference Management System. Bạn có thể sử dụng Swagger UI để test và tương tác với API một cách dễ dàng!
