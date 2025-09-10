# Database Setup Instructions

This document explains how to set up the Oracle database for the Conference Management System.

## Prerequisites

1. **Oracle Database 21c** (or compatible version) installed and running
2. **Node.js 20+** installed
3. **Oracle Instant Client** installed (if not using full Oracle installation)

## Setup Steps

### 1. Configure Environment Variables

Make sure your `.env` file contains the correct database connection details:

```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_CONNECT_STRING=localhost:1521/XE
```

### 2. Create Database User (if needed)

If you need to create a new database user, connect to Oracle as a system administrator and run:

```sql
-- Create user
CREATE USER cms_user IDENTIFIED BY your_password;

-- Grant necessary privileges
GRANT CONNECT, RESOURCE TO cms_user;
GRANT CREATE TABLE TO cms_user;
GRANT CREATE SEQUENCE TO cms_user;
GRANT CREATE VIEW TO cms_user;
GRANT CREATE TRIGGER TO cms_user;

-- Grant additional privileges for development
GRANT UNLIMITED TABLESPACE TO cms_user;
```

### 3. Initialize Database Schema

Run the database initialization script:

```bash
# Build the project first
npm run build

# Initialize the database
npm run db:init
```

This will:

- Create all necessary tables
- Insert seed data
- Set up the notifications system
- Create indexes for performance

### 4. Verify Installation

You can verify the installation by checking if the tables exist:

```sql
-- Connect to your database and run:
SELECT table_name FROM user_tables ORDER BY table_name;
```

You should see tables like:

- APP_USERS
- CONFERENCES
- SESSIONS
- ATTENDEES
- ROLES
- PERMISSIONS
- And many more...

## Database Schema Overview

The system uses the following main tables:

### Core Tables

- **APP_USERS**: System users (admin, staff, attendees)
- **ROLES**: User roles (admin, staff, attendee)
- **PERMISSIONS**: System permissions
- **USER_ROLES**: User-role assignments
- **ROLE_PERMISSIONS**: Role-permission assignments

### Conference Management

- **CONFERENCES**: Conference information
- **FLOORS**: Conference floor layout
- **ROOMS**: Conference rooms
- **SESSIONS**: Conference sessions

### Attendee Management

- **ATTENDEES**: Attendee profiles
- **REGISTRATIONS**: Conference registrations
- **CHECKINS**: Check-in records

### Communication

- **MESSAGES**: Q&A and chat messages
- **MATCHES**: Attendee networking matches

### System

- **AUDIT_LOGS**: System audit trail
- **NOTIFICATIONS**: User notifications (if notifications module is enabled)

## Troubleshooting

### Common Issues

1. **"Table or view does not exist" error**

   - Make sure you ran `npm run db:init` successfully
   - Check that your database user has the necessary privileges

2. **"ORA-00942: table or view does not exist"**

   - The database schema hasn't been created yet
   - Run `npm run db:init` to create the schema

3. **Connection refused**

   - Check your `DB_CONNECT_STRING` in the `.env` file
   - Ensure Oracle database is running
   - Verify Oracle Instant Client is installed

4. **Permission denied**
   - Make sure your database user has the necessary privileges
   - Check the user creation script above

### Reset Database

If you need to reset the database:

```sql
-- WARNING: This will delete all data!
-- Connect as the database user and run:
DROP USER cms_user CASCADE;
-- Then recreate the user and run npm run db:init again
```

## Development Notes

- The database connection is optional in development mode
- All database operations use connection pooling for performance
- The system supports both Oracle and MySQL (with different schema files)
- Make sure to backup your data before making schema changes

## Support

If you encounter issues with database setup, check:

1. Oracle database logs
2. Application logs
3. Network connectivity
4. User permissions

For more help, refer to the main README.md file or contact the development team.
