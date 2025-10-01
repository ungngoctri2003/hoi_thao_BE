# Session-Based Check-in Feature

## Tổng quan

Tính năng check-in theo session cho phép theo dõi sự tham gia của người tham dự vào từng phiên cụ thể trong hội nghị, thay vì chỉ check-in chung cho toàn bộ hội nghị.

## Cài đặt Database

### 1. Chạy Migration SQL

Trước khi sử dụng tính năng này, bạn cần chạy migration SQL để thêm cột `SESSION_ID` vào bảng `CHECKINS`:

```bash
# Kết nối với Oracle database và chạy:
sqlplus username/password@database

@src/database/add-session-to-checkins.sql
```

Hoặc sao chép nội dung của file `src/database/add-session-to-checkins.sql` và chạy trong SQL client của bạn.

### 2. Cấu trúc dữ liệu mới

Bảng `CHECKINS` giờ có thêm:
- `SESSION_ID` (NUMBER, nullable): ID của session mà người tham dự check-in
  - `NULL`: Check-in cho toàn bộ hội nghị
  - Có giá trị: Check-in cho session cụ thể

## API Usage

### Endpoint: POST `/api/v1/public/checkins/checkin`

### 1. Check-in theo Session qua QR Code

```json
{
  "checkInMethod": "qr",
  "conferenceId": 12,
  "sessionId": 10,
  "qrCode": "{\"id\":68,\"conf\":12,\"session\":10,\"t\":1759332776039,\"type\":\"attendee_registration\",\"cs\":\"57d0ec5\",\"v\":\"2.0\"}"
}
```

**Lưu ý:** 
- QR code có thể chứa `session` field, nếu không truyền `sessionId` trong request body, hệ thống sẽ lấy từ QR code
- Nếu có cả `sessionId` trong request body và trong QR code, `sessionId` trong request body sẽ được ưu tiên

### 2. Check-in cho toàn bộ hội nghị (Conference-level)

```json
{
  "checkInMethod": "qr",
  "conferenceId": 12,
  "qrCode": "{\"id\":68,\"conf\":12,\"t\":1759332776039,\"type\":\"attendee_registration\"}"
}
```

Không truyền `sessionId` hoặc truyền `null`/`undefined`.

### 3. Check-in thủ công theo Session

```json
{
  "attendeeId": 68,
  "checkInMethod": "manual",
  "conferenceId": 12,
  "sessionId": 10
}
```

### 4. Response

```json
{
  "data": {
    "ID": 81,
    "REGISTRATION_ID": 148,
    "SESSION_ID": 10,
    "CHECKIN_TIME": "2025-10-01T16:07:04.812Z",
    "METHOD": "qr",
    "STATUS": "success"
  }
}
```

**Các giá trị `STATUS`:**
- `success`: Check-in thành công lần đầu
- `duplicate`: Đã check-in trong vòng 24h cho cùng session
- `error`: Có lỗi xảy ra

## Tính năng chính

### 1. Phân biệt Check-in

Hệ thống phân biệt giữa:
- **Conference-level check-in** (SESSION_ID = NULL): Check-in chung cho hội nghị
- **Session-level check-in** (SESSION_ID có giá trị): Check-in cho từng session cụ thể

Một người tham dự có thể:
- Check-in 1 lần cho toàn bộ hội nghị
- Check-in nhiều lần cho các session khác nhau
- Check-in lại cho cùng session sau 24h

### 2. Duplicate Detection

Hệ thống kiểm tra duplicate check-in trong vòng 24h:
- Với cùng `REGISTRATION_ID` và `SESSION_ID`
- Nếu đã check-in, trả về status `duplicate` nhưng vẫn ghi nhận lần check-in mới

### 3. Tự động tạo Registration

Nếu chưa có registration, hệ thống sẽ tự động:
1. Tìm hoặc tạo attendee từ QR data
2. Tạo registration cho attendee và conference
3. Thực hiện check-in với session ID (nếu có)

## Testing

### Chạy test script

```bash
node test-session-checkin.js
```

Script sẽ test 3 scenarios:
1. QR check-in với session ID
2. QR check-in không có session ID (conference-level)
3. Manual check-in với session ID

### Test thủ công với curl/PowerShell

**PowerShell:**
```powershell
$body = @{
    checkInMethod = "qr"
    conferenceId = 12
    sessionId = 10
    qrCode = '{"id":68,"conf":12,"session":10,"t":1759332776039,"type":"attendee_registration"}'
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/public/checkins/checkin" -Method POST -Body $body -ContentType "application/json"
```

## Queries hữu ích

### 1. Xem tất cả check-ins của một session

```sql
SELECT c.*, a.NAME, a.EMAIL
FROM CHECKINS c
JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
JOIN ATTENDEES a ON a.ID = r.ATTENDEE_ID
WHERE c.SESSION_ID = 10
ORDER BY c.CHECKIN_TIME DESC;
```

### 2. Đếm số người tham dự theo session

```sql
SELECT 
    s.ID as SESSION_ID,
    s.TITLE as SESSION_TITLE,
    COUNT(DISTINCT c.REGISTRATION_ID) as ATTENDEE_COUNT
FROM SESSIONS s
LEFT JOIN CHECKINS c ON c.SESSION_ID = s.ID AND c.STATUS = 'success'
WHERE s.CONFERENCE_ID = 12
GROUP BY s.ID, s.TITLE
ORDER BY s.START_TIME;
```

### 3. Xem lịch sử check-in của một attendee

```sql
SELECT 
    c.ID,
    c.CHECKIN_TIME,
    c.METHOD,
    c.STATUS,
    CASE 
        WHEN c.SESSION_ID IS NULL THEN 'Conference Check-in'
        ELSE s.TITLE 
    END as SESSION_INFO
FROM CHECKINS c
JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
LEFT JOIN SESSIONS s ON s.ID = c.SESSION_ID
WHERE r.ATTENDEE_ID = 68
ORDER BY c.CHECKIN_TIME DESC;
```

## Migration từ hệ thống cũ

Các check-ins cũ (không có SESSION_ID) vẫn hoạt động bình thường và được coi là conference-level check-ins.

Không cần thay đổi dữ liệu cũ, chỉ cần chạy migration SQL để thêm cột mới.

## Lưu ý quan trọng

1. **Backward Compatibility**: API vẫn hoạt động với requests không có `sessionId`, các requests này sẽ tạo conference-level check-ins.

2. **QR Code Format**: QR code nên chứa trường `session` để hỗ trợ check-in theo session:
   ```json
   {
     "id": 68,
     "conf": 12,
     "session": 10,
     "t": 1759332776039,
     "type": "attendee_registration"
   }
   ```

3. **Performance**: Đã thêm indexes để tối ưu queries:
   - `IDX_CHECKINS_SESSION` trên `SESSION_ID`
   - `IDX_CHECKINS_REG_SESSION` trên `(REGISTRATION_ID, SESSION_ID)`

4. **Cascade Delete**: Khi xóa session, tất cả check-ins liên quan sẽ bị xóa theo.

