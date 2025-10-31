import { Router } from 'express';
import { AuthController } from '../controller/AuthController';

const router = Router();
const authController = new AuthController();

router.post('/signup', (req, res) => authController.signup(req, res));
router.post('/login', (req, res) => authController.login(req, res));

export default router;

