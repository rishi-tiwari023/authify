import { Router } from 'express';
import { AuthController } from '../controller/AuthController';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../validation/authSchemas';
import { updateUserRoleSchema } from '../validation/userSchemas';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to auth endpoints
const publicAuthRateLimit = rateLimitMiddleware({ maxRequests: 10, windowMs: 60000 });
const passwordResetRateLimit = rateLimitMiddleware({ maxRequests: 5, windowMs: 300000 });
const refreshRateLimit = rateLimitMiddleware({ maxRequests: 30, windowMs: 60000 });

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 * @body {string} name - User's full name
 * @body {string} email - User's email address
 * @body {string} password - User's password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.post('/signup', publicAuthRateLimit, validateBody(signupSchema), (req, res) => authController.signup(req, res));

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT token
 * @access Public
 * @body {string} email - User's email address
 * @body {string} password - User's password
 */
router.post('/login', publicAuthRateLimit, validateBody(loginSchema), (req, res) => authController.login(req, res));

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token using refresh token
 * @access Public (uses refresh token validation)
 * @body {string} refreshToken - Refresh token
 */
router.post('/refresh', refreshRateLimit, validateBody(refreshTokenSchema), (req, res) => authController.refreshToken(req, res));

/**
 * @route GET /api/auth/me
 * @desc Get current authenticated user's information
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, (req, res) => authController.me(req as any, res));

/**
 * @route GET /api/auth/users
 * @desc Get all users (Admin only)
 * @access Private (Admin)
 * @header Authorization: Bearer <token>
 */
router.get('/users', authMiddleware, requireRole('ADMIN'), (req, res) => authController.listUsers(req, res));

/**
 * @route PATCH /api/auth/users/:userId/role
 * @desc Update a user's role (Admin only)
 * @access Private (Admin)
 * @header Authorization: Bearer <token>
 * @body {string} role - New role value (USER or ADMIN)
 */
router.patch(
  '/users/:userId/role',
  authMiddleware,
  requireRole('ADMIN'),
  validateBody(updateUserRoleSchema),
  (req, res) => authController.updateUserRole(req as any, res)
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset token
 * @access Public
 * @body {string} email - User's email address
 */
router.post('/forgot-password', passwordResetRateLimit, validateBody(forgotPasswordSchema), (req, res) => authController.forgotPassword(req, res));

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using token
 * @access Public
 * @body {string} token - Password reset token
 * @body {string} newPassword - New password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.post('/reset-password', passwordResetRateLimit, validateBody(resetPasswordSchema), (req, res) => authController.resetPassword(req, res));

export default router;

