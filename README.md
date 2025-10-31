# Authify

Full-stack authentication demo showcasing signup, signin, and protected dashboard functionality.

## Structure

```
authify/
├── frontend/     # Frontend application
├── backend/      # Backend API server
│   └── src/
│       ├── config/
│       │   └── data-source.ts
│       ├── controller/
│       │   └── AuthController.ts
│       ├── middleware/
│       │   └── authMiddleware.ts
│       ├── model/
│       │   └── User.ts
│       ├── repository/
│       │   └── UserRepository.ts
│       ├── routes/
│       │   └── authRoutes.ts
│       ├── service/
│       │   └── AuthService.ts
│       └── index.ts
└── package.json  # Root workspace configuration
```

## Status

Initial setup complete. Incremental backend modules added:

- Auth routes: `backend/src/routes/authRoutes.ts`
- Controller: `backend/src/controller/AuthController.ts`
- Service: `backend/src/service/AuthService.ts`
- Repository: `backend/src/repository/UserRepository.ts`
- Middleware: `backend/src/middleware/authMiddleware.ts`

Next steps: add password hashing and JWT issuance/verification.
