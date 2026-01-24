# Startup Guide 🚀

Welcome to **Authify**! This guide will help you get the project up and running on your local machine if you've just forked or cloned the repository.

## 📋 Prerequisites

Ensure you have the following installed:
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **npm**: v9.0.0 or higher

---

## 🛠️ Initial Setup

### 1. Clone & Install
First, clone the repository and install the dependencies for both the frontend and backend.

```bash
git clone <your-fork-url>
cd authify
npm install
```

### 2. Database Creation
Create a PostgreSQL database named `authify`.

```bash
psql -U postgres -c "CREATE DATABASE authify;"
```

### 3. Environment Variables
You need to configure the backend environment. Copy the example file and update the values (especially your database credentials and SMTP settings for email features).

```bash
cd backend
cp env.example .env
```

**Key variables to set in `backend/.env`:**
- `DB_USER` & `DB_PASSWORD`: Your local Postgres credentials.
- `JWT_SECRET`: A long random string.
- `TWO_FACTOR_ENCRYPTION_KEY`: A 32-character encryption key.
- `SMTP_*`: Your email provider settings (required for password resets).

---

## 🏃 Running the Application

You can start both the frontend and backend concurrently from the root directory:

```bash
# In the root 'authify' directory
npm run dev
```

The application will be available at:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 🧪 Verifying the Installation

To ensure everything is working correctly, you can run the backend integration tests:

```bash
cd backend
npm test
```

---

## 📖 Further Documentation
- [Main README](README.md)
