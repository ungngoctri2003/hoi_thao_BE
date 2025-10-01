# Fix: Check-in Response trả về N/A thay vì tên người tham dự

## Vấn đề

Khi check-in thành công, frontend hiển thị: **"Check-in thành công cho N/A"**

### Nguyên nhân

Backend response chỉ trả về `CheckinRow` cơ bản:
```json
{
  "ID": 89,
  "REGISTRATION_ID": 148,
  "SESSION_ID": 10,
  "CHECKIN_TIME": "2025-10-01T16:37:34.267Z",
  "METHOD": "qr",
  "STATUS": "success"
}
```

**THIẾU**: `ATTENDEE_NAME`, `ATTENDEE_EMAIL`, `ATTENDEE_PHONE`, `QR_CODE`, `CONFERENCE_ID`

Frontend API client mapping:
```typescript
attendeeName:
  responseData.attendeeName ||
  responseData.ATTENDEE_NAME ||  // ❌ KHÔNG CÓ
  responseData.attendee_name ||
  "N/A",  // ← Fallback thành "N/A"
```

## Giải pháp

Sửa `scanByQr()` và `manual()` trong `checkins.repository.ts` để JOIN với bảng ATTENDEES và REGISTRATIONS:

### Before:
```sql
SELECT ID, REGISTRATION_ID, SESSION_ID, CHECKIN_TIME, METHOD, STATUS 
FROM CHECKINS 
WHERE ID = :id
```

### After:
```sql
SELECT c.ID, c.REGISTRATION_ID, c.SESSION_ID, c.CHECKIN_TIME, c.METHOD, c.STATUS,
       a.NAME as ATTENDEE_NAME, 
       a.EMAIL as ATTENDEE_EMAIL, 
       a.PHONE as ATTENDEE_PHONE,
       r.QR_CODE, 
       r.CONFERENCE_ID
FROM CHECKINS c
JOIN REGISTRATIONS r ON r.ID = c.REGISTRATION_ID
JOIN ATTENDEES a ON a.ID = r.ATTENDEE_ID
WHERE c.ID = :id
```

## Kết quả

Response bây giờ có đầy đủ thông tin:
```json
{
  "data": {
    "ID": 91,
    "REGISTRATION_ID": 148,
    "SESSION_ID": 10,
    "CHECKIN_TIME": "2025-10-01T16:37:44.267Z",
    "METHOD": "qr",
    "STATUS": "duplicate",
    "ATTENDEE_NAME": "Bui Thi Hoa",        // ✅ Có rồi!
    "ATTENDEE_EMAIL": "hoa.bui@email.com", // ✅ Có rồi!
    "ATTENDEE_PHONE": "0901234574",        // ✅ Có rồi!
    "QR_CODE": "QR_68_12",
    "CONFERENCE_ID": 12
  }
}
```

Frontend hiển thị: **"Check-in thành công cho Bui Thi Hoa"** ✅

## Files đã sửa

1. `src/modules/checkins/checkins.repository.ts`
   - Function `scanByQr()` - dòng 55-65
   - Function `manual()` - dòng 106-116

## Testing

### Test 1: QR Check-in
```powershell
$body = @{
  attendeeId = 68
  checkInMethod = "qr"
  conferenceId = 12
  qrCode = '{"id":68,"conf":12,"session":10,"t":1759332777777,"type":"attendee_registration"}'
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/public/checkins/checkin" `
  -Method POST -Body $body -ContentType "application/json"
```

**Expected**: Response có `ATTENDEE_NAME`, `ATTENDEE_EMAIL`, `ATTENDEE_PHONE`

### Test 2: Manual Check-in
```powershell
$body = @{
  attendeeId = 68
  checkInMethod = "manual"
  conferenceId = 12
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/public/checkins/checkin" `
  -Method POST -Body $body -ContentType "application/json"
```

**Expected**: Response có đầy đủ thông tin attendee

### Test 3: Duplicate Check-in
```powershell
# Check-in 2 lần liên tiếp
# Lần 1: STATUS = "success"
# Lần 2: STATUS = "duplicate"
# Cả 2 lần đều có ATTENDEE_NAME
```

## Impact

### Positive:
- ✅ Frontend hiển thị đúng tên người check-in
- ✅ Không cần thêm API call để lấy thông tin attendee
- ✅ Response đầy đủ hơn cho logging/debugging
- ✅ Consistent với `list()` function đã có sẵn

### Performance:
- Thêm 2 JOINs nhưng:
  - REGISTRATIONS và ATTENDEES đã được index
  - Chỉ query 1 record (WHERE ID = :id)
  - Impact minimal

## Related Issues

Vấn đề này cũng ảnh hưởng đến:
1. Check-in records list - ✅ Đã có sẵn JOINs
2. Controller trực tiếp gọi repository - ⚠️ Cần kiểm tra

## Recommendations

1. **Type Definition**: Update `CheckinRow` type để include attendee fields (optional)
   ```typescript
   export type CheckinRow = {
     ID: number;
     REGISTRATION_ID: number;
     SESSION_ID?: number | null;
     CHECKIN_TIME: Date;
     METHOD: 'qr' | 'manual';
     STATUS: 'success' | 'duplicate' | 'error';
     // Extended fields from JOIN
     ATTENDEE_NAME?: string;
     ATTENDEE_EMAIL?: string;
     ATTENDEE_PHONE?: string;
     QR_CODE?: string;
     CONFERENCE_ID?: number;
   };
   ```

2. **Documentation**: Update API docs để reflect new response format

3. **Frontend**: Verify mapping vẫn hoạt động với các field mới


