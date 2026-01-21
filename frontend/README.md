# Authify Frontend

The frontend application for Authify, built with React, Vite, and TypeScript.

## Features

- 📱 Responsive and modern UI
- 🔐 Secure authentication flows (Signup, Login, Logout)
- 🛡️ Two-Factor Authentication (TOTP) setup and verification
- 👤 User profile management and password updates
- 👑 Admin dashboard for user management
- 📧 Email verification and password reset interfaces
- 🔄 Automatic JWT token refresh

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `VITE_API_URL` to your backend API URL (default: `http://localhost:3000/api`).

### Development

Run the development server:
```bash
npm run dev
```
The application will usually be available at `http://localhost:5173`.

### Production

Build the application for production:
```bash
npm run build
```
The production-ready files will be in the `dist/` directory.

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: React Context API
- **Routing**: React Router
- **Styling**: Vanilla CSS (Modern CSS features)
- **API Client**: Fetch API with custom service wrapper

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL for the backend API | `http://localhost:3000/api` |
