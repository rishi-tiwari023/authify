import { Router } from 'express';
import { AuthController } from '../controller/AuthController';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation/authSchemas';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to auth endpoints
const authRateLimit = rateLimitMiddleware(5, 60000); // 5 requests per minute

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 * @body {string} name - User's full name
 * @body {string} email - User's email address
 * @body {string} password - User's password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.post('/signup', authRateLimit, validateBody(signupSchema), (req, res) => authController.signup(req, res));

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT token
 * @access Public
 * @body {string} email - User's email address
 * @body {string} password - User's password
 */
router.post('/login', authRateLimit, validateBody(loginSchema), (req, res) => authController.login(req, res));

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token using refresh token
 * @access Public (uses refresh token validation)
 * @body {string} refreshToken - Refresh token
 */
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

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
 * @route POST /api/auth/forgot-password
 * @desc Request password reset token
 * @access Public
 * @body {string} email - User's email address
 */
router.post('/forgot-password', authRateLimit, validateBody(forgotPasswordSchema), (req, res) => authController.forgotPassword(req, res));

/**
 * @route POST /api/auth/reset-password
 * @desc Reset password using token
 * @access Public
 * @body {string} token - Password reset token
 * @body {string} newPassword - New password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.post('/reset-password', authRateLimit, validateBody(resetPasswordSchema), (req, res) => authController.resetPassword(req, res));

export default router;

