import { Router } from 'express';
import { AuthController } from '../controller/AuthController';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to auth endpoints
const authRateLimit = rateLimitMiddleware(5, 60000); // 5 requests per minute

router.post('/signup', authRateLimit, (req, res) => authController.signup(req, res));
router.post('/login', authRateLimit, (req, res) => authController.login(req, res));
router.post('/refresh', authMiddleware, (req, res) => authController.refreshToken(req as any, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req as any, res));
router.get('/users', authMiddleware, requireRole('ADMIN'), (req, res) => authController.listUsers(req, res));

export default router;

