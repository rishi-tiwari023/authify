import { Router } from 'express';
import { AuthController } from '../controller/AuthController';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';

const router = Router();
const authController = new AuthController();

router.post('/signup', (req, res) => authController.signup(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/refresh', authMiddleware, (req, res) => authController.refreshToken(req as any, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req as any, res));
router.get('/users', authMiddleware, requireRole('ADMIN'), (req, res) => authController.listUsers(req, res));

export default router;

