# Authify Backend

A secure authentication backend API built with Node.js, Express, TypeScript, and TypeORM.

## Features

- 🔐 User authentication (signup, login, JWT tokens)
- 🔑 Password reset functionality
- 👤 User profile management
- 🛡️ Role-based access control (Admin/User)
- ⚡ Rate limiting
- ✅ Input validation and sanitization
- 🔒 Password hashing with bcrypt
- 📝 Request logging

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Duplicate the sample file and adjust values for your environment:
```bash
cp env.example .env   # or copy env.example .env on Windows
```

Key variables:
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- JWT: `JWT_SECRET`
- Email: `EMAIL_FROM`, `EMAIL_FROM_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `FRONTEND_URL`
- Server: `PORT`, `NODE_ENV`, `APP_VERSION`

4. Start PostgreSQL and create the database:
```sql
CREATE DATABASE authify;
```

5. Run the application:
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/users` - List all users (Admin only)

### User Management

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/password` - Change password
- `DELETE /api/user/account` - Delete account

### Health Check

- `GET /health` - Server health status

## Request/Response Examples

### Signup
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "name": "Rishi Tiwari",
  "email": "rishi@example.com",
  "password": "SecurePass123!"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "rishi@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "user": {
    "id": "uuid",
    "name": "Rishi Tiwari",
    "email": "rishi@example.com",
    "role": "USER",
    "profileUrl": null,
    "createdAt": "2025-11-10T00:00:00.000Z",
    "updatedAt": "2025-11-11T00:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

### Update Profile
```bash
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Rishi Tiwari",
  "email": "rishi@example.com",
  "profileUrl": "https://example.com/avatar.jpg"
}
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Rate Limiting

Authentication endpoints are rate-limited to 5 requests per minute per IP address.

## Security Features

- Passwords are hashed using bcrypt (10 salt rounds)
- JWT tokens with configurable expiration
- Input validation and sanitization
- CORS protection
- SQL injection protection (TypeORM parameterized queries)
- XSS protection

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controller/       # Request handlers
│   ├── middleware/       # Express middleware
│   ├── model/           # TypeORM entities
│   ├── repository/      # Data access layer
│   ├── routes/          # Route definitions
│   ├── service/         # Business logic
│   └── utils/           # Utility functions
├── dist/                # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## License

MIT

