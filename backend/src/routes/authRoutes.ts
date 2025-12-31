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
  verifyEmailSchema,
  setup2FASchema,
  enable2FASchema,
  verify2FASchema,
  disable2FASchema,
  regenerateBackupCodesSchema,
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

/**
 * @route POST /api/auth/verify-email
 * @desc Verify email address using token
 * @access Public
 * @body {string} token - Email verification token
 */
router.post('/verify-email', publicAuthRateLimit, validateBody(verifyEmailSchema), (req, res) => authController.verifyEmail(req, res));

/**
 * @route POST /api/auth/resend-verification
 * @desc Resend email verification email
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.post('/resend-verification', authMiddleware, (req, res) => authController.resendVerificationEmail(req as any, res));

/**
 * @route POST /api/auth/2fa/setup
 * @desc Initiate 2FA setup (returns secret and QR code)
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.post('/2fa/setup', authMiddleware, validateBody(setup2FASchema), (req, res) => authController.setup2FA(req as any, res));

/**
 * @route POST /api/auth/2fa/enable
 * @desc Enable 2FA with verification code
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} token - 6-digit TOTP code
 */
router.post('/2fa/enable', authMiddleware, validateBody(enable2FASchema), (req, res) => authController.enable2FA(req as any, res));

/**
 * @route POST /api/auth/2fa/verify
 * @desc Verify 2FA code during login
 * @access Public
 * @body {string} userId - User ID from login response
 * @body {string} token - 6-digit TOTP code or backup code
 */
router.post('/2fa/verify', publicAuthRateLimit, validateBody(verify2FASchema), (req, res) => authController.verify2FA(req, res));

/**
 * @route POST /api/auth/2fa/disable
 * @desc Disable 2FA
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} password - Current password
 */
router.post('/2fa/disable', authMiddleware, validateBody(disable2FASchema), (req, res) => authController.disable2FA(req as any, res));

/**
 * @route POST /api/auth/2fa/backup-codes
 * @desc Regenerate backup codes
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} password - Current password
 */
router.post('/2fa/backup-codes', authMiddleware, validateBody(regenerateBackupCodesSchema), (req, res) => authController.regenerateBackupCodes(req as any, res));

export default router;

