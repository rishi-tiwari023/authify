## Authify Technical Interview Q&A

**Q: Give me the 30-second overview of Authify.**  
A: Authify is a full-stack authentication demo that pairs a Vite/React frontend with an Express + TypeORM backend running on Postgres. It lets candidates showcase user registration, login, health checks, and password-reset workflows with real infrastructure primitives such as sanitization middleware, structured logging, and repository-driven data access. The project intentionally mirrors production checklists—input validation, background jobs, rate limiting—so discussing it demonstrates depth beyond a to-do app.

**Q: How is the system architected end-to-end?**  
A: Traffic lands on Vite-built React screens (e.g., `Signup.tsx`) that call a thin API client in `frontend/src/services/api.ts`. Requests hit the Express server (`backend/src/index.ts`), where cross-cutting middleware (CORS, security headers, sanitation, logging, rate limiting) runs before routing. Business logic lives in controllers delegating to services such as `AuthService`, which in turn rely on repositories backed by TypeORM entities (`User`, `PasswordResetToken`). Postgres is configured through `backend/src/config/data-source.ts`, and long-running concerns like token cleanup are hosted in dedicated services (`TokenCleanupService`). This keeps presentation, transport, domain, and persistence layers cleanly separated.

**Q: What were the biggest technical challenges you faced?**  
A: The hardest piece was reconciling security requirements with developer ergonomics. For example, password-reset links need to expire quickly, but doing that purely at request time causes stale tokens to accumulate. I solved it by introducing `TokenCleanupService`, a background interval that purges expired tokens every hour and on boot, which kept the DB tidy without blocking the request path. Another challenge was enforcing consistent input hygiene; the fix was to centralize sanitization/validation middleware so controllers only see normalized data.

**Q: How do you handle security concerns like XSS, brute force, or leaked credentials?**  
A: Multiple layers are in place. Incoming payloads go through `sanitizationMiddleware` plus validation helpers to strip malicious input. `securityHeadersMiddleware` tightens headers (CSP, HSTS, frameguard) to limit browser attack surface, and `rateLimitMiddleware` throttles repeated auth attempts to slow brute force attacks. Passwords are hashed with bcrypt (10 salt rounds) before storage, and reset tokens are random 32-byte hex strings stored server-side with short expirations. The health and error handlers avoid leaking stack traces. Combined, those measures cover both transport- and data-layer threats.

**Q: Walk me through the signup flow from the UI to the database.**  
A: On the client, the `Signup` component enforces basic form validation (non-empty fields, email regex, password length/match) and shows inline errors. Submissions go through the shared API utility, which injects JSON headers and base URLs. Once at the API, Express middleware sanitizes the body, controller `AuthController.signup` calls `AuthService.signup`, which validates again, ensures the email is unique, hashes the password, persists the user via `UserRepository`, and asynchronously fires a welcome email through `EmailService`. The service returns a DTO so the controller can respond without leaking hash data.

**Q: How does password reset work and how do you prevent token abuse?**  
A: Requests to `/api/auth/password/reset` validate the email, upsert the user’s outstanding tokens (delete previous ones), generate a 32-byte random token, and set a one-hour TTL. Tokens are stored in `PasswordResetToken` with `used` flags. On reset, the service ensures the token exists, isn’t expired, and wasn’t used before updating the password hash and marking the token as used. The cleanup service deletes any expired tokens on an hourly cadence to minimize attack windows. Users never learn whether an email exists, avoiding user enumeration.

**Q: What parts of the codebase are tested and why?**  
A: Validation schemas under `backend/src/validation` have Jest coverage to ensure we don’t regress on password/email rules, because those functions are pure and security-sensitive. For the UI, I relied on Vite’s fast dev server for manual verification, but the next planned step is to add React Testing Library smoke tests around the auth forms. Prioritizing validation tests first gave the highest ROI given the project’s security focus.

**Q: How do you ensure observability and diagnosability?**  
A: Every request runs through `loggerMiddleware`, which logs method, URL, status, and latency. Errors bubble to a centralized `errorHandler` that normalizes the JSON structure and status codes. There’s also a `/health` endpoint exposing service version, uptime, environment, and DB connectivity, which is handy for liveness probes or pre-interview demos. For long-running jobs (token cleanup or email sending), failures are surfaced via `console.error`, but the plan is to swap in a structured logger (pino/winston) and metrics exporter.

**Q: What would you improve if you had another sprint?**  
A: Top items: (1) issue JWTs + refresh tokens so the frontend can actually hold authenticated sessions; (2) add an audit trail table capturing logins/password resets for compliance narratives; (3) move the email service behind a provider abstraction (SendGrid/Postmark), injecting API keys via env-configured secrets; (4) wrap the React forms with React Hook Form + Zod for shared validation logic; and (5) Dockerize both services for quicker interview demos.

**Q: How do you keep the frontend UX resilient while the backend is still evolving?**  
A: The frontend is intentionally thin and optimistic; it performs client-side validation with friendly copy so most errors are caught before hitting the API. When the backend returns validation errors, the form surfaces them via a shared `error` state. Suspenseful actions (signup submission) use a loading flag to disable inputs, providing clear affordance. Because all API calls go through `services/api.ts`, adding features like auth headers or retry logic won’t require touching every component.

**Q: Describe a debugging session you handled in this project.**  
A: I once ran into intermittent “repository not set” errors. The root cause was hitting routes before TypeORM finished initializing. I fixed it by exporting `initializeDatabase()` from `data-source.ts`, calling it during bootstrap before attaching routes, and guarding repository constructors so they only run after initialization. That eliminated the race and forced me to think about lifecycle ordering in Node services.

**Q: How do you talk about this project when asked “why should we care?”**  
A: Authify demonstrates that I think about production-grade concerns—even in a demo. I can speak to middleware ordering, data modeling, async job handling, security hardening, and DX tradeoffs. Interviewers often push past “it’s an auth app,” so having concrete implementation details and war stories (cleanup service, validation strategy, TypeORM race fix) shows I’ve wrestled with the nuances they deal with daily.


