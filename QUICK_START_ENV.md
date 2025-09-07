# 🚀 Hướng dẫn nhanh - Tự động JWT Secrets

## ✅ Đã hoàn thành!

Hệ thống đã được cấu hình để **tự động tạo JWT secrets** mà không cần copy-paste thủ công.

## 🎯 Cách sử dụng

### 1. Khởi động server (tự động tạo .env nếu cần)
```bash
npm run start:with-env
```

### 2. Tạo file .env mới
```bash
npm run env:generate
```

### 3. Cập nhật JWT secrets
```bash
npm run env:update
```

### 4. Development mode (tự động kiểm tra .env)
```bash
npm run dev
```

## 🔑 JWT Secrets hiện tại

File `.env` đã được tạo với JWT secrets ngẫu nhiên:
- **JWT_ACCESS_SECRET**: `1525af1b293e30040ed49af5085772cdaa5623824c18489c632fd447479de444`
- **JWT_REFRESH_SECRET**: `1e879d7bd9179c7ae5a90d91502d73674647ef8ce28279511e0f10b97a0cad5c`

## ⚠️ Lưu ý

- JWT secrets được tạo ngẫu nhiên mỗi lần chạy `env:update`
- Trong production, hãy sử dụng JWT secrets cố định
- File `.env` không được commit vào git

## 🎉 Kết quả

**Bạn không cần phải copy-paste JWT secrets nữa!** Hệ thống sẽ tự động:
- ✅ Kiểm tra file .env khi khởi động
- ✅ Tạo file .env nếu chưa tồn tại  
- ✅ Generate JWT secrets ngẫu nhiên
- ✅ Cập nhật JWT secrets khi cần
