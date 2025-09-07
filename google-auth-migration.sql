-- Migration để thêm firebase_uid vào bảng users
-- Chạy SQL này trong database

-- Thêm cột firebase_uid vào bảng users
ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;

-- Tạo index cho firebase_uid để tối ưu tìm kiếm
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

-- Cập nhật bảng attendees (nếu cần)
ALTER TABLE attendees ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;
CREATE INDEX idx_attendees_firebase_uid ON attendees(firebase_uid);
