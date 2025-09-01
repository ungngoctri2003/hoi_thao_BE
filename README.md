# Conference Management Backend (Express + Oracle)

A robust backend system for managing conferences, attendees, sessions, and networking features built with Express.js and Oracle Database.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Conference Management**: CRUD operations for conferences and sessions
- **Attendee Management**: Registration, check-in, and profile management
- **Real-time Communication**: WebSocket support for live messaging and analytics
- **Audit Logging**: Comprehensive audit trail for all operations
- **API Documentation**: Swagger/OpenAPI documentation
- **Monitoring**: Prometheus metrics and health checks
- **Security**: Rate limiting, CORS, Helmet security headers

## Prerequisites

- Node.js 20+
- Oracle Database 21c (or compatible version)
- npm or yarn package manager

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your environment variables in `.env`:
   ```env
   # Database
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_CONNECT_STRING=localhost:1521/XE
   
   # JWT Secrets (CHANGE THESE IN PRODUCTION!)
   JWT_ACCESS_SECRET=your_super_secret_access_key
   JWT_REFRESH_SECRET=your_super_secret_refresh_key
   
   # Server
   PORT=4000
   NODE_ENV=development
   ```

## Installation

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Build the project:
   ```bash
   npm run build
   ```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

## Production

Start the production server:
```bash
npm start
```

## API Endpoints

- **Health Check**: `GET /healthz`
- **API Base**: `/api/v1`
- **Documentation**: `/docs` (Swagger UI)
- **Metrics**: `/metrics` (Prometheus metrics)

### Main Routes

- `/api/v1/auth` - Authentication (login, register, refresh)
- `/api/v1/conferences` - Conference management
- `/api/v1/sessions` - Session management
- `/api/v1/attendees` - Attendee management
- `/api/v1/registrations` - Registration management
- `/api/v1/checkins` - Check-in system
- `/api/v1/analytics` - Analytics and reporting
- `/api/v1/users` - User management
- `/api/v1/roles` - Role-based access control

## WebSocket Endpoints

- `/ws/messages` - Real-time messaging
- `/ws/analytics` - Live analytics updates

## Testing

Run the test suite:
```bash
npm test
```

## Docker

Build the Docker image:
```bash
docker build -t hoi-thao-be .
```

Run with Docker:
```bash
docker run -p 4000:4000 --env-file .env hoi-thao-be
```

## Database Schema

The system expects the following main tables:
- `APP_USERS` - User accounts
- `CONFERENCES` - Conference information
- `SESSIONS` - Session details
- `ATTENDEES` - Attendee profiles
- `REGISTRATIONS` - Conference registrations
- `CHECKINS` - Check-in records
- `ROLES` - User roles
- `PERMISSIONS` - System permissions
- `USER_ROLES` - User-role assignments
- `ROLE_PERMISSIONS` - Role-permission assignments

## Security Features

- **Rate Limiting**: Configurable request rate limiting
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for Express
- **JWT Validation**: Secure token-based authentication
- **Input Validation**: Request validation using Zod schemas
- **SQL Injection Protection**: Parameterized queries with Oracle

## Monitoring & Logging

- **Structured Logging**: Pino logger with configurable levels
- **Metrics**: Prometheus metrics for monitoring
- **Health Checks**: Built-in health check endpoints
- **Audit Trail**: Comprehensive audit logging for all operations

## Development Notes

- Oracle database connection is optional in development mode
- Uses in-memory token store for password reset (replace with Redis in production)
- All database operations use connection pooling for performance
- WebSocket connections support room-based messaging and analytics

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

ISC License




