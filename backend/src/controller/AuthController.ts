import { Request, Response } from 'express';
import { AuthService } from '../service/AuthService';
import jwt from 'jsonwebtoken';

export class AuthController {
  private authService: AuthService;
  private readonly jwtSecret: string;

  constructor() {
    this.authService = new AuthService();
    this.jwtSecret = process.env.JWT_SECRET || 'my-secret-key-change-in-production';
  }

  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await this.authService.signup({ name, email, password });
      res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const user = await this.authService.login({ email, password });
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      res.json({
        user: { id: user.id, name: user.name, email: user.email },
        token,
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }
}

