import { Router } from 'express';
import { AdminController } from '../controller/AdminController';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { UserRole } from '../model/User';

const router = Router();
const adminController = new AdminController();

// Stricter rate limiting for admin actions
const adminRateLimit = rateLimitMiddleware({ maxRequests: 30, windowMs: 60000 });

// Apply authentication and admin role check to all routes
router.use(authMiddleware);
router.use(requireRole(UserRole.ADMIN));
router.use(adminRateLimit);

/**
 * @route GET /api/admin/users/:id
 * @desc Get detailed user information
 */
router.get('/users/:id', (req, res) => adminController.getUser(req, res));

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete a user account
 */
router.delete('/users/:id', (req, res) => adminController.deleteUser(req as any, res));

/**
 * @route PATCH /api/admin/users/:id/ban
 * @desc Ban or unban a user
 * @body {boolean} isBanned - True to ban, false to unban
 */
router.patch('/users/:id/ban', (req, res) => adminController.banUser(req as any, res));

export default router;
