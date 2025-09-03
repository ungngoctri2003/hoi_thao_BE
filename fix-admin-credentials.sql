-- Script to fix admin login credentials
-- This script will create or update the admin user with correct credentials

-- First, check if admin user exists
SELECT ID, EMAIL, NAME, STATUS FROM APP_USERS WHERE EMAIL = 'admin@conference.vn';

-- If admin user doesn't exist, create it
-- Note: You'll need to hash the password 'admin123' using bcrypt
-- For now, we'll create the user and you can set the password using the backend

INSERT INTO APP_USERS (EMAIL, NAME, STATUS, AVATAR_URL) 
VALUES ('admin@conference.vn', 'Admin User', 'active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')
WHERE NOT EXISTS (SELECT 1 FROM APP_USERS WHERE EMAIL = 'admin@conference.vn');

-- Update admin user status to active if it exists
UPDATE APP_USERS 
SET STATUS = 'active' 
WHERE EMAIL = 'admin@conference.vn';

-- Check if admin role exists
SELECT ID, CODE, NAME FROM ROLES WHERE CODE = 'admin';

-- Create admin role if it doesn't exist
INSERT INTO ROLES (CODE, NAME, DESCRIPTION) 
VALUES ('admin', 'Administrator', 'System Administrator with full access')
WHERE NOT EXISTS (SELECT 1 FROM ROLES WHERE CODE = 'admin');

-- Assign admin role to admin user
INSERT INTO USER_ROLES (USER_ID, ROLE_ID)
SELECT u.ID, r.ID 
FROM APP_USERS u, ROLES r 
WHERE u.EMAIL = 'admin@conference.vn' 
AND r.CODE = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM USER_ROLES ur 
    WHERE ur.USER_ID = u.ID AND ur.ROLE_ID = r.ID
);

-- Verify the setup
SELECT 
    u.ID, 
    u.EMAIL, 
    u.NAME, 
    u.STATUS,
    r.CODE as ROLE_CODE,
    r.NAME as ROLE_NAME
FROM APP_USERS u
LEFT JOIN USER_ROLES ur ON u.ID = ur.USER_ID
LEFT JOIN ROLES r ON ur.ROLE_ID = r.ID
WHERE u.EMAIL = 'admin@conference.vn';
