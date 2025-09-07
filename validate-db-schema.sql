-- Oracle Database Schema Validation Script
-- This script checks if all required tables and columns exist

-- Check if all required tables exist
SELECT 
    'ATTENDEES' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'ATTENDEES'

UNION ALL

SELECT 
    'APP_USERS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'APP_USERS'

UNION ALL

SELECT 
    'CONFERENCES' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'CONFERENCES'

UNION ALL

SELECT 
    'SESSIONS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'SESSIONS'

UNION ALL

SELECT 
    'REGISTRATIONS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'REGISTRATIONS'

UNION ALL

SELECT 
    'CHECKINS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'CHECKINS'

UNION ALL

SELECT 
    'MESSAGES' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'MESSAGES'

UNION ALL

SELECT 
    'MATCHES' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'MATCHES'

UNION ALL

SELECT 
    'ROLES' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'ROLES'

UNION ALL

SELECT 
    'PERMISSIONS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'PERMISSIONS'

UNION ALL

SELECT 
    'USER_ROLES' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'USER_ROLES'

UNION ALL

SELECT 
    'ROLE_PERMISSIONS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'ROLE_PERMISSIONS'

UNION ALL

SELECT 
    'AUDIT_LOGS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'AUDIT_LOGS'

UNION ALL

SELECT 
    'FLOORS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'FLOORS'

UNION ALL

SELECT 
    'ROOMS' as table_name,
    CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as status
FROM user_tables 
WHERE table_name = 'ROOMS'

ORDER BY table_name;

-- Check critical columns for main tables
SELECT 'ATTENDEES columns check' as check_type;
DESC ATTENDEES;

SELECT 'APP_USERS columns check' as check_type;
DESC APP_USERS;

SELECT 'CONFERENCES columns check' as check_type;
DESC CONFERENCES;

SELECT 'SESSIONS columns check' as check_type;
DESC SESSIONS;

SELECT 'REGISTRATIONS columns check' as check_type;
DESC REGISTRATIONS;

-- Check for any sequences that might be needed
SELECT sequence_name, last_number 
FROM user_sequences 
WHERE sequence_name LIKE '%_SEQ'
ORDER BY sequence_name;

-- Check for any indexes
SELECT index_name, table_name, uniqueness
FROM user_indexes 
WHERE table_name IN ('ATTENDEES', 'APP_USERS', 'CONFERENCES', 'SESSIONS', 'REGISTRATIONS')
ORDER BY table_name, index_name;
