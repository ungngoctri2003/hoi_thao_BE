-- Notifications System Database Schema
-- Tạo bảng notifications để lưu trữ thông báo

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
    category ENUM('system', 'permission', 'conference', 'session', 'registration', 'general') NOT NULL DEFAULT 'general',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    data JSON NULL, -- Lưu trữ dữ liệu bổ sung (metadata)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Thời gian hết hạn thông báo
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES app_users(ID) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_user_archived (user_id, is_archived),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at),
    INDEX idx_type (type),
    INDEX idx_category (category)
);

-- Bảng notification_templates để lưu trữ template thông báo
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
    category ENUM('system', 'permission', 'conference', 'session', 'registration', 'general') NOT NULL DEFAULT 'general',
    variables JSON NULL, -- Danh sách các biến có thể thay thế
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng notification_preferences để lưu trữ tùy chọn thông báo của user
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    categories JSON NULL, -- Tùy chọn theo từng category
    quiet_hours_start TIME NULL, -- Giờ bắt đầu im lặng
    quiet_hours_end TIME NULL, -- Giờ kết thúc im lặng
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES app_users(ID) ON DELETE CASCADE
);

-- Bảng notification_logs để log việc gửi thông báo
CREATE TABLE IF NOT EXISTS notification_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id INT NOT NULL,
    user_id INT NOT NULL,
    delivery_method ENUM('in_app', 'email', 'push') NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'failed') NOT NULL DEFAULT 'pending',
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES app_users(ID) ON DELETE CASCADE,
    
    INDEX idx_notification_id (notification_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- Insert default notification templates
INSERT INTO notification_templates (name, title_template, message_template, type, category, variables) VALUES
('welcome', 'Chào mừng đến với hệ thống!', 'Chào mừng {{user_name}} đến với hệ thống quản lý hội thảo. Chúc bạn có trải nghiệm tốt!', 'success', 'system', '["user_name"]'),
('role_changed', 'Quyền của bạn đã được cập nhật', 'Role của bạn đã thay đổi từ "{{old_role}}" thành "{{new_role}}". Vui lòng đăng nhập lại để áp dụng thay đổi.', 'info', 'permission', '["old_role", "new_role"]'),
('conference_created', 'Hội thảo mới đã được tạo', 'Hội thảo "{{conference_name}}" đã được tạo và bạn có thể đăng ký tham gia.', 'info', 'conference', '["conference_name"]'),
('session_reminder', 'Nhắc nhở phiên họp', 'Phiên họp "{{session_title}}" sẽ bắt đầu sau {{time_remaining}} phút.', 'warning', 'session', '["session_title", "time_remaining"]'),
('registration_success', 'Đăng ký thành công', 'Bạn đã đăng ký thành công tham gia hội thảo "{{conference_name}}".', 'success', 'registration', '["conference_name"]'),
('system_maintenance', 'Bảo trì hệ thống', 'Hệ thống sẽ được bảo trì từ {{start_time}} đến {{end_time}}. Vui lòng lưu công việc của bạn.', 'warning', 'system', '["start_time", "end_time"]');

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, email_notifications, push_notifications, in_app_notifications)
SELECT ID, TRUE, TRUE, TRUE FROM app_users
WHERE ID NOT IN (SELECT user_id FROM notification_preferences);

-- Create view for unread notifications count
CREATE VIEW user_notification_counts AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count,
    SUM(CASE WHEN is_archived = FALSE THEN 1 ELSE 0 END) as active_count
FROM notifications 
WHERE expires_at IS NULL OR expires_at > NOW()
GROUP BY user_id;
