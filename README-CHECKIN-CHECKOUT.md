# Check-in / Check-out System

## Tổng quan

Hệ thống check-in/check-out cho phép theo dõi cả việc vào (check-in) và ra (check-out) của người tham dự khỏi hội nghị hoặc các phiên cụ thể.

## Features

### 1. Dual Action Support
- **Check-in**: Ghi nhận người tham dự vào hội nghị/phiên
- **Check-out**: Ghi nhận người tham dự ra khỏi hội nghị/phiên

### 2. Session-Level Tracking
- Check-in/out cho toàn bộ hội nghị (SESSION_ID = NULL)
- Check-in/out cho từng phiên cụ thể (SESSION_ID = specific session)

### 3. Multiple Methods
- **QR Code**: Quét mã QR để check-in/out nhanh
- **Manual**: Nhập thông tin thủ công

### 4. Duplicate Detection
- Kiểm tra duplicate trong 24h cho cùng:
  - Registration ID
  - Session ID (nếu có)
  - Action Type (checkin hoặc checkout)

## Database Schema

### Migration SQL

File: `src/database/add-checkout-to-checkins.sql`

```sql
ALTER TABLE CHECKINS ADD ACTION_TYPE VARCHAR2(20) DEFAULT 'checkin' 
    CHECK (ACTION_TYPE IN ('checkin', 'checkout'));

ALTER TABLE CHECKINS ADD SESSION_ID NUMBER;
ALTER TABLE CHECKINS ADD CONSTRAINT FK_CHECKINS_SESSION 
    FOREIGN KEY (SESSION_ID) REFERENCES SESSIONS(ID) ON DELETE CASCADE;

CREATE INDEX IDX_CHECKINS_ACTION ON CHECKINS(ACTION_TYPE);
CREATE INDEX IDX_CHECKINS_SESSION ON CHECKINS(SESSION_ID);
CREATE INDEX IDX_CHECKINS_REG_ACTION_SESSION ON CHECKINS(REGISTRATION_ID, ACTION_TYPE, SESSION_ID);
```

### Table Structure

```sql
CHECKINS (
    ID NUMBER PRIMARY KEY,
    REGISTRATION_ID NUMBER NOT NULL,
    SESSION_ID NUMBER NULL,                    -- Session-specific check-in/out
    CHECKIN_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    METHOD VARCHAR2(20) DEFAULT 'qr',          -- 'qr', 'manual', 'nfc'
    STATUS VARCHAR2(20) DEFAULT 'success',     -- 'success', 'duplicate', 'error'
    ACTION_TYPE VARCHAR2(20) DEFAULT 'checkin' -- 'checkin' or 'checkout'
)
```

## API Usage

### Endpoint: POST `/api/v1/public/checkins/checkin`

### 1. Check-in qua QR Code

```json
{
  "checkInMethod": "qr",
  "conferenceId": 12,
  "sessionId": 10,
  "actionType": "checkin",
  "qrCode": "{\"id\":68,\"conf\":12,\"session\":10,...}"
}
```

### 2. Check-out qua QR Code

```json
{
  "checkInMethod": "qr",
  "conferenceId": 12,
  "sessionId": 10,
  "actionType": "checkout",
  "qrCode": "{\"id\":68,\"conf\":12,\"session\":10,...}"
}
```

### 3. Manual Check-in

```json
{
  "attendeeId": 68,
  "checkInMethod": "manual",
  "conferenceId": 12,
  "sessionId": 10,
  "actionType": "checkin"
}
```

### 4. Manual Check-out

```json
{
  "attendeeId": 68,
  "checkInMethod": "manual",
  "conferenceId": 12,
  "sessionId": 10,
  "actionType": "checkout"
}
```

## Response Format

```json
{
  "data": {
    "ID": 91,
    "REGISTRATION_ID": 148,
    "SESSION_ID": 10,
    "CHECKIN_TIME": "2025-10-01T16:37:44.267Z",
    "METHOD": "qr",
    "STATUS": "success",
    "ACTION_TYPE": "checkin",
    "ATTENDEE_NAME": "Bui Thi Hoa",
    "ATTENDEE_EMAIL": "hoa.bui@email.com",
    "ATTENDEE_PHONE": "0901234574",
    "QR_CODE": "QR_68_12",
    "CONFERENCE_ID": 12
  }
}
```

## Status Values

- **success**: Action thực hiện thành công lần đầu
- **duplicate**: Đã thực hiện action này trong vòng 24h
- **error**: Có lỗi xảy ra

## Use Cases

### UC1: Vào hội nghị buổi sáng
```
1. Chọn "Check-in"
2. Quét QR code
3. Hệ thống ghi nhận: ACTION_TYPE='checkin', STATUS='success'
```

### UC2: Ra về ăn trưa
```
1. Chọn "Check-out"
2. Quét QR code
3. Hệ thống ghi nhận: ACTION_TYPE='checkout', STATUS='success'
```

### UC3: Vào lại buổi chiều
```
1. Chọn "Check-in"
2. Quét QR code
3. Hệ thống ghi nhận: ACTION_TYPE='checkin', STATUS='success' (khác với buổi sáng vì khác action)
```

### UC4: Check-in vào phiên cụ thể
```
1. Chọn "Check-in"
2. Quét QR code có sessionId=10
3. Hệ thống ghi nhận: ACTION_TYPE='checkin', SESSION_ID=10
```

## Queries thường dùng

### 1. Tổng số check-in và check-out

```sql
SELECT 
    ACTION_TYPE,
    COUNT(*) as TOTAL_ACTIONS,
    COUNT(DISTINCT REGISTRATION_ID) as UNIQUE_ATTENDEES
FROM CHECKINS c
JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
WHERE r.CONFERENCE_ID = 12
AND c.STATUS = 'success'
GROUP BY ACTION_TYPE;
```

### 2. Ai đang có mặt tại hội nghị

```sql
SELECT 
    a.NAME,
    a.EMAIL,
    MAX(CASE WHEN c.ACTION_TYPE = 'checkin' AND c.STATUS = 'success' THEN c.CHECKIN_TIME END) as LAST_CHECKIN,
    MAX(CASE WHEN c.ACTION_TYPE = 'checkout' AND c.STATUS = 'success' THEN c.CHECKIN_TIME END) as LAST_CHECKOUT,
    CASE 
        WHEN MAX(CASE WHEN c.ACTION_TYPE = 'checkin' THEN c.CHECKIN_TIME END) > 
             COALESCE(MAX(CASE WHEN c.ACTION_TYPE = 'checkout' THEN c.CHECKIN_TIME END), TO_DATE('1900-01-01', 'YYYY-MM-DD'))
        THEN 'Đang có mặt'
        ELSE 'Đã ra về'
    END as STATUS
FROM ATTENDEES a
JOIN REGISTRATIONS r ON r.ATTENDEE_ID = a.ID
LEFT JOIN CHECKINS c ON c.REGISTRATION_ID = r.ID
WHERE r.CONFERENCE_ID = 12
GROUP BY a.ID, a.NAME, a.EMAIL
ORDER BY LAST_CHECKIN DESC;
```

### 3. Lịch sử check-in/out của một người

```sql
SELECT 
    c.CHECKIN_TIME,
    c.ACTION_TYPE,
    c.STATUS,
    CASE WHEN c.SESSION_ID IS NULL THEN 'Conference' ELSE s.TITLE END as LOCATION,
    CASE 
        WHEN c.ACTION_TYPE = 'checkin' THEN 'Vào'
        WHEN c.ACTION_TYPE = 'checkout' THEN 'Ra'
    END as ACTION_TEXT
FROM CHECKINS c
JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
LEFT JOIN SESSIONS s ON s.ID = c.SESSION_ID
WHERE r.ATTENDEE_ID = 68
AND r.CONFERENCE_ID = 12
ORDER BY c.CHECKIN_TIME DESC;
```

### 4. Attendance report theo session

```sql
SELECT 
    s.TITLE as SESSION_NAME,
    COUNT(DISTINCT CASE WHEN c.ACTION_TYPE = 'checkin' AND c.STATUS = 'success' THEN r.ATTENDEE_ID END) as CHECKED_IN,
    COUNT(DISTINCT CASE WHEN c.ACTION_TYPE = 'checkout' AND c.STATUS = 'success' THEN r.ATTENDEE_ID END) as CHECKED_OUT
FROM SESSIONS s
LEFT JOIN CHECKINS c ON c.SESSION_ID = s.ID
LEFT JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
WHERE s.CONFERENCE_ID = 12
GROUP BY s.ID, s.TITLE
ORDER BY s.START_TIME;
```

## Frontend Integration

### Component Structure

```
CheckInPage
├── ActionTypeSelector (NEW)
│   ├── Check-in button
│   └── Check-out button
├── ConferenceSelector
├── SessionSelector (if applicable)
└── CheckInMethods
    ├── QR Scanner
    ├── QR Upload
    └── Manual Form
```

### State Management

```typescript
const [selectedActionType, setSelectedActionType] = useState<"checkin" | "checkout">("checkin");

// Pass to all check-in API calls
const response = await checkInAPI.checkInAttendee({
  ...otherParams,
  actionType: selectedActionType
});
```

## Business Logic

### Registration Status Updates

- **Check-in**: REGISTRATIONS.STATUS → 'checked-in'
- **Check-out**: REGISTRATIONS.STATUS → 'checked-out'

### Duplicate Detection Logic

```typescript
// Duplicate khi:
// - Cùng REGISTRATION_ID
// - Cùng SESSION_ID (hoặc cả 2 đều NULL)
// - Cùng ACTION_TYPE
// - Trong vòng 24h
```

## Testing

### Test Script

```bash
node test-checkin-checkout.js
```

### Manual Tests

```powershell
# Test 1: Check-in
$body = @{
  checkInMethod = "qr"
  conferenceId = 12
  actionType = "checkin"
  qrCode = '{"id":68,"conf":12}'
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/public/checkins/checkin" `
  -Method POST -Body $body -ContentType "application/json"

# Test 2: Check-out
$body = @{
  checkInMethod = "qr"
  conferenceId = 12
  actionType = "checkout"
  qrCode = '{"id":68,"conf":12}'
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/public/checkins/checkin" `
  -Method POST -Body $body -ContentType "application/json"
```

## Migration Guide

### Từ hệ thống cũ (chỉ check-in)

1. Run migration SQL: `add-checkout-to-checkins.sql`
2. Run migration SQL: `add-session-to-checkins.sql`
3. Update backend code (đã hoàn thành)
4. Update frontend code (follow PATCH-CHECKIN-CHECKOUT-SELECTOR.md)
5. Test thoroughly

### Data Migration

Tất cả records cũ sẽ tự động có `ACTION_TYPE='checkin'` và `SESSION_ID=NULL`.

## Security

- Validate actionType ở backend
- Default là 'checkin' nếu không được cung cấp
- Check permissions trước khi cho phép check-out
- Log tất cả actions để audit

## Performance

- Indexes trên ACTION_TYPE, SESSION_ID
- Composite index trên (REGISTRATION_ID, ACTION_TYPE, SESSION_ID)
- Query optimization cho duplicate detection

## Future Enhancements

1. **Time-based rules**: Chỉ cho check-out sau khi check-in
2. **Location tracking**: Ghi nhận vị trí check-in/out
3. **Batch operations**: Check-in/out nhiều người cùng lúc
4. **Reports**: Dashboard realtime cho attendance
5. **Notifications**: Thông báo khi ai đó check-in/out

