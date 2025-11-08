import { Router } from 'express';
import { UserController } from '../controller/UserController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const userController = new UserController();

/**
 * @route GET /api/user/profile
 * @desc Get user's profile information
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.get('/profile', authMiddleware, (req, res) => userController.getProfile(req as any, res));

/**
 * @route PUT /api/user/profile
 * @desc Update user's profile information
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} [name] - User's full name
 * @body {string} [email] - User's email address
 * @body {string} [profileUrl] - User's profile picture URL
 */
router.put('/profile', authMiddleware, (req, res) => userController.updateProfile(req as any, res));

/**
 * @route PUT /api/user/password
 * @desc Change user's password
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} currentPassword - User's current password
 * @body {string} newPassword - User's new password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.put('/password', authMiddleware, (req, res) => userController.changePassword(req as any, res));

/**
 * @route DELETE /api/user/account
 * @desc Delete user's account
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.delete('/account', authMiddleware, (req, res) => userController.deleteAccount(req as any, res));

export default router;

