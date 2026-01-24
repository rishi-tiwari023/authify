# Authify

Full-stack authentication demo showcasing signup, signin, and protected dashboard functionality.

## Features

- �️ Two-Factor Authentication (2FA) with TOTP
- �🔐 User authentication (signup, login, JWT tokens)
- 🔑 Password reset functionality
- 👤 User profile management
- 🛡️ Role-based access control (Admin/User)
- ⚡ Rate limiting
- ✅ Input validation and sanitization
- 🔒 Password hashing with bcrypt
- 📝 Request logging

## Prerequisites

> 🚀 **Quick Start**: For a streamlined setup guide, check out <br> [Startup.md](Startup.md).

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**
- **Git**

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd authify
   ```

2. **Install dependencies:**
   ```bash
   # Install root workspace dependencies
   npm install
   
   # Or install frontend and backend separately
   cd frontend ; npm install ; cd ..
   cd backend ; npm install ; cd ..
   ```

3. **Set up the backend environment:**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your configuration (see Environment Variables section)
   ```

4. **Set up the database:**
   ```sql
   # Connect to PostgreSQL and create the database
   CREATE DATABASE authify;
   ```

5. **Start PostgreSQL** (if not already running):
   ```bash
   # On macOS/Linux
   sudo service postgresql start
   
   # On Windows
   # Start PostgreSQL service from Services or use pg_ctl
   ```

## Quick Start

### Running Both Frontend and Backend

From the root directory:

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run them separately in different terminals
npm run dev:frontend  # Runs frontend on http://localhost:5173
npm run dev:backend   # Runs backend on http://localhost:3000
```

### Running Separately

**Backend:**
```bash
cd backend
npm run dev  # Development mode with hot reload
```

**Frontend:**
```bash
cd frontend
npm run dev  # Development server (usually http://localhost:5173)
```

## Project Structure

```
authify/
├── frontend/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── services/      # API service layer
│   │   └── utils/         # Utility functions
│   └── package.json
├── backend/               # Express + TypeScript backend API
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controller/    # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── model/         # TypeORM entities
│   │   ├── repository/    # Data access layer
│   │   ├── routes/        # Route definitions
│   │   ├── service/       # Business logic
│   │   ├── utils/         # Utility functions
│   │   └── validation/    # Request validation schemas
│   ├── env.example        # Environment variables template
│   └── package.json
└── package.json           # Root workspace configuration
```

## Environment Variables

### Backend Configuration

The backend requires a `.env` file in the `backend/` directory. Copy `env.example` to `.env` and configure the following variables:

#### Server Configuration
```env
PORT=3000                  # Port for the backend server
NODE_ENV=development       # Environment: development, production, or test
APP_VERSION=1.0.0          # Application version
```

#### Database Configuration (PostgreSQL)
```env
DB_HOST=localhost          # PostgreSQL host
DB_PORT=5432               # PostgreSQL port
DB_USER=postgres           # PostgreSQL username
DB_PASSWORD=postgres       # PostgreSQL password
DB_NAME=authify            # Database name
```

#### JWT Configuration
```env
JWT_SECRET=your-secret-key           # Primary secret for JWT access tokens
JWT_EXPIRATION=15m                   # Access token lifespan (e.g., 15m, 1h)
REFRESH_TOKEN_SECRET=your-refresh-key # Secret for refresh token signing
REFRESH_TOKEN_EXPIRATION=7d          # Refresh token lifespan (e.g., 7d, 30d)
```

#### Security & CORS Configuration
```env
CORS_ORIGIN=http://localhost:5173    # Comma-separated list of allowed origins
TWO_FACTOR_ENCRYPTION_KEY=your-key    # 32-byte key for encrypting 2FA secrets
```

#### Email/SMTP Configuration
```env
EMAIL_FROM=noreply@authify.com      # Email address to send from
EMAIL_FROM_NAME=Authify             # Display name for email sender
FRONTEND_URL=http://localhost:5173  # Frontend URL for password reset links
SMTP_HOST=smtp.example.com          # SMTP server hostname
SMTP_PORT=587                       # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                   # Use TLS (false for port 587, true for port 465)
SMTP_USER=your-smtp-username        # SMTP authentication username
SMTP_PASS=your-smtp-password        # SMTP authentication password
```

**Common SMTP Providers:**
- **Gmail**: `smtp.gmail.com`, port `587`, use App Password
- **SendGrid**: `smtp.sendgrid.net`, port `587`, username: `apikey`
- **Mailgun**: Check your Mailgun dashboard for SMTP settings
- **AWS SES**: Use SES SMTP credentials

### Frontend Configuration (Optional)

The frontend can be configured with environment variables. Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3000/api  # Backend API URL (defaults to http://localhost:3000/api)
```

## Database Setup

### Creating the Database

1. **Connect to PostgreSQL:**
   ```bash
   psql -U postgres
   ```

2. **Create the database:**
   ```sql
   CREATE DATABASE authify;
   ```

3. **Verify the database was created:**
   ```sql
   \l
   ```

4. **Exit PostgreSQL:**
   ```sql
   \q
   ```

The application uses TypeORM for database management. While `synchronize: true` is enabled in development for quick prototyping, production environments use a migration-based workflow.

**Running Migrations:**
```bash
cd backend
npm run migration:run
```

**Reverting Migrations:**
```bash
npm run migration:revert
```

### Database Connection Troubleshooting

If you encounter connection issues:

1. **Verify PostgreSQL is running:**
   ```bash
   # Check service status
   sudo systemctl status postgresql    # Linux
   brew services list                  # macOS
   # Windows: Check Services panel
   ```

2. **Verify connection details in `.env`:**
   - Ensure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` are correct
   - Test connection manually: `psql -h localhost -p 5432 -U postgres -d authify`

3. **Check PostgreSQL logs:**
   - Location varies by OS and installation method
   - Common locations: `/var/log/postgresql/` (Linux), `/usr/local/var/log/` (macOS Homebrew)

## Email Service Configuration

The application uses Nodemailer to send emails for password resets and email verification. Configuration is done through environment variables in the backend `.env` file.

### Setup Steps

1. **Choose an SMTP provider** (Gmail, SendGrid, Mailgun, AWS SES, etc.)

2. **Get SMTP credentials** from your email provider

3. **Configure the `.env` file** with your SMTP settings (see Environment Variables section)

### Gmail Setup Example

To use Gmail as your email provider:

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password:**
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create a new app password for "Mail"
   - Copy the 16-character password
3. **Configure `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### SendGrid Setup Example

1. **Sign up for SendGrid** and verify your account
2. **Create an API Key:**
   - Go to Settings → API Keys → Create API Key
   - Give it "Mail Send" permissions
3. **Configure `.env`:**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   ```

### Testing Email Configuration

After configuring your email service:

1. Start the backend server
2. Use the "Forgot Password" feature on the frontend
3. Check your email inbox for the password reset email
4. Check server logs for any SMTP errors

### Email Features

The application sends emails for:
- **Password Reset**: When a user requests a password reset
- **Email Verification**: When a new user signs up (if enabled)

All emails include links that point to the frontend URL configured in `FRONTEND_URL`.

## Status

Initial setup complete. Incremental backend modules added:

- Auth routes: `backend/src/routes/authRoutes.ts`
- Controller: `backend/src/controller/AuthController.ts`
- Service: `backend/src/service/AuthService.ts`
- Repository: `backend/src/repository/UserRepository.ts`
- Middleware: `backend/src/middleware/authMiddleware.ts`
