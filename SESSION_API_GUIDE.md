# Hướng dẫn sử dụng Session API

## Tổng quan

API này cho phép tạo, cập nhật, xóa và quản lý các session trong hệ thống quản lý hội nghị.

## Endpoints

### 1. Tạo Session mới

**POST** `/api/v1/conferences/{confId}/sessions`

#### Headers

```
Content-Type: application/json
Authorization: Bearer <your-token>
```

#### Request Body (JSON)

```json
{
  "TITLE": "Tên session (BẮT BUỘC)",
  "SPEAKER": "Tên diễn giả (tùy chọn)",
  "START_TIME": "2024-01-15T10:00:00Z (BẮT BUỘC)",
  "END_TIME": "2024-01-15T11:00:00Z (BẮT BUỘC)",
  "STATUS": "upcoming (tùy chọn, mặc định: upcoming)",
  "DESCRIPTION": "Mô tả session (tùy chọn)",
  "ROOM_ID": 123 (tùy chọn)
}
```

#### Các trường bắt buộc:

- `TITLE`: Tên session (string, không được rỗng, tối đa 255 ký tự)
- `START_TIME`: Thời gian bắt đầu (ISO 8601 format)
- `END_TIME`: Thời gian kết thúc (ISO 8601 format)

#### Các trường tùy chọn:

- `SPEAKER`: Tên diễn giả (string, tối đa 255 ký tự)
- `STATUS`: Trạng thái session (enum: upcoming, live, active, completed, ended)
- `DESCRIPTION`: Mô tả (string, tối đa 2000 ký tự)
- `ROOM_ID`: ID phòng (number, phải là số nguyên dương)

#### Response thành công (201):

```json
{
  "success": true,
  "data": {
    "ID": 123,
    "CONFERENCE_ID": 12,
    "ROOM_ID": null,
    "TITLE": "Tên session",
    "SPEAKER": "Tên diễn giả",
    "START_TIME": "2024-01-15T10:00:00.000Z",
    "END_TIME": "2024-01-15T11:00:00.000Z",
    "STATUS": "upcoming",
    "DESCRIPTION": "Mô tả session"
  }
}
```

#### Response lỗi validation (400):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid session data. Please check the required fields.",
    "details": [
      {
        "field": "body.TITLE",
        "message": "Session title is required",
        "received": undefined
      }
    ]
  }
}
```

### 2. Lấy danh sách sessions

**GET** `/api/v1/conferences/{confId}/sessions`

#### Query Parameters:

- `status`: Lọc theo trạng thái (tùy chọn)
- `roomId`: Lọc theo phòng (tùy chọn)

### 3. Lấy session theo ID

**GET** `/api/v1/sessions/{id}`

### 4. Cập nhật session

**PATCH** `/api/v1/sessions/{id}`

### 5. Xóa session

**DELETE** `/api/v1/sessions/{id}`

## Các lỗi thường gặp

### 1. Lỗi Validation

**Lỗi:** `"Invalid input: expected string, received undefined"`
**Nguyên nhân:** Thiếu trường bắt buộc `TITLE`
**Giải pháp:** Đảm bảo request body chứa trường `TITLE` với giá trị string không rỗng

### 2. Lỗi Authentication

**Lỗi:** `"Missing or invalid authorization header"`
**Nguyên nhân:** Thiếu hoặc sai token xác thực
**Giải pháp:** Thêm header `Authorization: Bearer <your-token>`

### 3. Lỗi Database

**Lỗi:** `"ORA-01745: invalid host/bind variable name"`
**Nguyên nhân:** Đã được sửa trong phiên bản hiện tại
**Giải pháp:** Cập nhật lên phiên bản mới nhất

## Ví dụ sử dụng

### Tạo session cơ bản:

```bash
curl -X POST "http://localhost:4000/api/v1/conferences/12/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "TITLE": "Workshop React Hooks",
    "SPEAKER": "John Doe",
    "START_TIME": "2024-01-15T10:00:00Z",
    "END_TIME": "2024-01-15T11:30:00Z",
    "STATUS": "upcoming",
    "DESCRIPTION": "Học về React Hooks từ cơ bản đến nâng cao"
  }'
```

### Tạo session tối thiểu:

```bash
curl -X POST "http://localhost:4000/api/v1/conferences/12/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "TITLE": "Keynote Speech",
    "START_TIME": "2024-01-15T09:00:00Z",
    "END_TIME": "2024-01-15T10:00:00Z"
  }'
```

## Test endpoint (không cần authentication)

**POST** `/api/v1/test/test-session-validation`

Sử dụng endpoint này để test validation mà không cần token xác thực.

## Lưu ý quan trọng

1. Tất cả thời gian phải ở định dạng ISO 8601 (UTC)
2. Trường `TITLE` là bắt buộc và không được rỗng
3. Trường `START_TIME` và `END_TIME` là bắt buộc
4. Các trường khác là tùy chọn
5. Luôn kiểm tra response để xử lý lỗi phù hợp
