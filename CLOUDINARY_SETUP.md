# Cloudinary Setup Guide

## 1. Tạo tài khoản Cloudinary

1. Truy cập [https://cloudinary.com](https://cloudinary.com)
2. Đăng ký tài khoản miễn phí
3. Xác nhận email

## 2. Lấy thông tin API

1. Đăng nhập vào Cloudinary Dashboard
2. Vào phần "Dashboard" 
3. Copy các thông tin sau:
   - **Cloud Name**: Tên cloud của bạn
   - **API Key**: Khóa API
   - **API Secret**: Mật khẩu API

## 3. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 4. Test Upload

Sau khi cấu hình, bạn có thể test upload ảnh:

```bash
# Test endpoint
curl -X POST http://localhost:4000/api/v1/upload/image \
  -H "Content-Type: application/json" \
  -d '{"imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."}'
```

## 5. Tính năng

- ✅ Upload ảnh lên cloud storage
- ✅ Tự động nén và tối ưu ảnh
- ✅ Hỗ trợ nhiều format (JPG, PNG, GIF, WebP)
- ✅ Resize ảnh tự động (max 800x800)
- ✅ Lưu trữ bền vững, không mất khi deploy
- ✅ CDN toàn cầu cho tốc độ tải nhanh

## 6. Giới hạn miễn phí

- **Storage**: 25GB
- **Bandwidth**: 25GB/tháng
- **Transformations**: 25,000/tháng
- **Uploads**: Không giới hạn

## 7. Bảo mật

- API Secret chỉ dùng ở backend
- Có thể set up upload presets để kiểm soát quyền upload
- Có thể set up signed uploads cho bảo mật cao hơn

## 8. Troubleshooting

### Lỗi "Invalid credentials"
- Kiểm tra lại Cloud Name, API Key, API Secret
- Đảm bảo không có khoảng trắng thừa

### Lỗi "Upload failed"
- Kiểm tra kết nối internet
- Kiểm tra format ảnh có được hỗ trợ không
- Kiểm tra kích thước file (max 5MB)

### Ảnh không hiển thị
- Kiểm tra URL trả về từ Cloudinary
- Kiểm tra CORS settings nếu cần
