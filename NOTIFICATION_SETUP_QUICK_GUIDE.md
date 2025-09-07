# 🚀 Hướng Dẫn Setup Nhanh Hệ Thống Thông Báo

## ⚡ Setup Nhanh (5 phút)

### 1. Setup Database Oracle
```bash
cd HOI_THAO_BE

# Cài đặt dependencies (nếu chưa có)
npm install oracledb

# Chạy script setup database
node setup-notifications-db-oracle.js
```

### 2. Cập nhật Backend
```bash
# File đã được cập nhật tự động:
# - src/routes/notifications/notifications.routes.ts
# - src/modules/notifications/notifications.repository.oracle.ts
# - src/modules/users/users.repository.ts (thêm method findAll)

# Khởi động lại backend
npm run dev
```

### 3. Cập nhật Frontend
```bash
cd conference-management-system

# File đã được cập nhật tự động:
# - lib/notification-api.ts
# - lib/notification-service.ts
# - components/notifications/notification-panel.tsx
# - components/notifications/admin-notification-manager.tsx
# - hooks/use-notification-websocket.ts
# - components/notifications/notification-provider.tsx

# Khởi động lại frontend
npm run dev
```

### 4. Tích hợp vào Layout
Thêm vào file layout chính của bạn:
```tsx
import { NotificationProvider } from '@/components/notifications/notification-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
```

## 🎯 Test Nhanh

### 1. Test API
```bash
# Test gửi thông báo (cần admin token)
curl -X POST http://localhost:5000/api/notifications/send/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Test message","type":"info"}'
```

### 2. Test Frontend
1. Đăng nhập với tài khoản admin
2. Vào trang admin và sử dụng `AdminNotificationManager`
3. Gửi thông báo test đến user khác
4. Kiểm tra notification bell ở header

## 🔧 Troubleshooting

### Lỗi Database Connection
```bash
# Kiểm tra Oracle connection
# Đảm bảo biến môi trường đúng:
# DB_USER=your_username
# DB_PASSWORD=your_password  
# DB_CONNECT_STRING=localhost:1521/XE
```

### Lỗi Import
```bash
# Nếu có lỗi import, kiểm tra:
# 1. File notifications.repository.oracle.ts có tồn tại
# 2. Import path đúng trong routes
```

### Lỗi Frontend
```bash
# Nếu có lỗi frontend:
# 1. Kiểm tra NEXT_PUBLIC_API_URL
# 2. Kiểm tra localStorage có access_token
# 3. Kiểm tra user role có phải admin không
```

## 📋 Checklist

- [ ] Database Oracle đã setup
- [ ] Backend đã khởi động
- [ ] Frontend đã khởi động  
- [ ] NotificationProvider đã tích hợp
- [ ] Admin có thể gửi thông báo
- [ ] User có thể nhận thông báo
- [ ] WebSocket hoạt động realtime

## 🎉 Hoàn thành!

Hệ thống thông báo đã sẵn sàng sử dụng với:
- ✅ Database Oracle
- ✅ Backend API đầy đủ
- ✅ Frontend components
- ✅ Realtime WebSocket
- ✅ Admin management panel

**Lưu ý**: Đảm bảo bạn đang sử dụng bảng `app_users` thay vì `users` trong database.
