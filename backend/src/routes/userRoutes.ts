import { Router } from 'express';
import { UserController } from '../controller/UserController';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { updateProfileSchema, changePasswordSchema } from '../validation/userSchemas';

const router = Router();
const userController = new UserController();
const authenticatedUserRateLimit = rateLimitMiddleware({
  maxRequests: 60,
  windowMs: 60000,
  keyGenerator: (req) => (req as AuthRequest).user?.id || req.ip,
});

/**
 * @route GET /api/user/profile
 * @desc Get user's profile information
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.get('/profile', authMiddleware, authenticatedUserRateLimit, (req, res) => userController.getProfile(req as any, res));

/**
 * @route PUT /api/user/profile
 * @desc Update user's profile information
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} [name] - User's full name
 * @body {string} [email] - User's email address
 * @body {string} [profileUrl] - User's profile picture URL
 */
router.put('/profile', authMiddleware, authenticatedUserRateLimit, validateBody(updateProfileSchema), (req, res) => userController.updateProfile(req as any, res));

/**
 * @route PUT /api/user/password
 * @desc Change user's password
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} currentPassword - User's current password
 * @body {string} newPassword - User's new password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.put('/password', authMiddleware, authenticatedUserRateLimit, validateBody(changePasswordSchema), (req, res) => userController.changePassword(req as any, res));

/**
 * @route DELETE /api/user/account
 * @desc Delete user's account
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.delete('/account', authMiddleware, authenticatedUserRateLimit, (req, res) => userController.deleteAccount(req as any, res));

export default router;

