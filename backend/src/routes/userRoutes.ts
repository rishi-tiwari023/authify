import { Router } from 'express';
import { UserController } from '../controller/UserController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const userController = new UserController();

// All user routes require authentication
router.get('/profile', authMiddleware, (req, res) => userController.getProfile(req as any, res));
router.put('/profile', authMiddleware, (req, res) => userController.updateProfile(req as any, res));
router.put('/password', authMiddleware, (req, res) => userController.changePassword(req as any, res));
router.delete('/account', authMiddleware, (req, res) => userController.deleteAccount(req as any, res));

export default router;

