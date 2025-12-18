# Authify

Full-stack authentication demo showcasing signup, signin, and protected dashboard functionality.

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

## Status

Initial setup complete. Incremental backend modules added:

- Auth routes: `backend/src/routes/authRoutes.ts`
- Controller: `backend/src/controller/AuthController.ts`
- Service: `backend/src/service/AuthService.ts`
- Repository: `backend/src/repository/UserRepository.ts`
- Middleware: `backend/src/middleware/authMiddleware.ts`
