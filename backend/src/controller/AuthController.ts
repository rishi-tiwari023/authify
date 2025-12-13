import { Request, Response } from 'express';
import { AuthService } from '../service/AuthService';
import jwt from 'jsonwebtoken';
import type { SignOptions, Secret } from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserRepository } from '../repository/UserRepository';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { RefreshTokenInput } from '../validation/authSchemas';
import { UserRole } from '../model/User';
import { UserService } from '../service/UserService';
import { ActivityLogService } from '../service/ActivityLogService';

export class AuthController {
  private authService: AuthService;
  private readonly jwtSecret: Secret;
  private readonly jwtExpiresIn: SignOptions['expiresIn'];
  private readonly refreshSecret: Secret;
  private readonly refreshExpiresIn: SignOptions['expiresIn'];
  private userRepository: UserRepository;
  private userService: UserService;
  private activityLogService: ActivityLogService;

  constructor() {
    this.authService = new AuthService();
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!accessSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET is not configured');
    }

    this.jwtSecret = accessSecret;
    this.jwtExpiresIn = (process.env.JWT_EXPIRATION || '15m') as SignOptions['expiresIn'];
    this.refreshSecret = refreshSecret;
    this.refreshExpiresIn = (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as SignOptions['expiresIn'];
    this.userRepository = new UserRepository();
    this.userService = new UserService();
    this.activityLogService = new ActivityLogService();
  }

  private signToken(user: { id: string; email: string; role: string }) {
    const signOptions: SignOptions = { expiresIn: this.jwtExpiresIn };

    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      this.jwtSecret,
      signOptions
    );
  }

  private signRefreshToken(user: { id: string; email: string; role: string }) {
    const signOptions: SignOptions = { expiresIn: this.refreshExpiresIn };

    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      this.refreshSecret,
      signOptions
    );
  }

  private async logActivity(
    userId: string,
    action: string,
    req?: Request,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.activityLogService.log({
        userId,
        action,
        metadata,
        ipAddress: req?.ip,
        userAgent: (req?.headers['user-agent'] as string | undefined) || undefined,
      });
    } catch (error) {
      console.error('Failed to log activity', error);
    }
  }

  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await this.authService.signup({ name, email, password });
      const token = this.signToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = this.signRefreshToken({ id: user.id, email: user.email, role: user.role });

      this.logActivity(user.id, 'signup', req);

      res.status(201).json({
        user: user.toSafeJSON(),
        token,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
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

      const token = this.signToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = this.signRefreshToken({ id: user.id, email: user.email, role: user.role });

      this.logActivity(user.id, 'login', req);

      res.json({
        user: user.toSafeJSON(),
        token,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const user = await this.userRepository.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user.toSafeJSON());
  }

  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
      const search = (req.query.search as string | undefined)?.trim() || undefined;
      const role = (req.query.role as UserRole | undefined) || undefined;

      const result = await this.userService.listUsers({ page, limit, search, role });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async updateUserRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (req.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Admin role required');
      }

      const { userId } = req.params as { userId: string };
      const { role } = req.body as { role: UserRole };

      const updated = await this.userService.updateUserRole(userId, { role });
      this.logActivity(req.user.id, 'update_user_role', req, { targetUserId: userId, role });
      res.json(updated);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (req.user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Admin role required');
      }

      const { userId } = req.params as { userId: string };

      if (userId === req.user.id) {
        res.status(400).json({ error: 'Admins cannot delete their own account via admin endpoint' });
        return;
      }

      await this.userService.deleteUser(userId);
      this.logActivity(req.user.id, 'delete_user', req, { targetUserId: userId });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  async refreshToken(req: Request<unknown, unknown, RefreshTokenInput>, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const decoded = jwt.verify(refreshToken, this.refreshSecret) as jwt.JwtPayload;
      const userId = decoded?.id as string | undefined;

      if (!userId) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const token = this.signToken({ id: user.id, email: user.email, role: user.role });
      const newRefreshToken = this.signRefreshToken({ id: user.id, email: user.email, role: user.role });

      res.json({
        token,
        refreshToken: newRefreshToken,
        user: user.toSafeJSON(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      await this.authService.requestPasswordReset(email);
      
      // Always return success message for security (don't reveal if email exists)
      res.json({
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        // Still return success message even if email doesn't exist (security best practice)
        res.json({
          message: 'If the email exists, a password reset link has been sent',
        });
        return;
      }
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }

      await this.authService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }

      await this.authService.verifyEmail(token);
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  async resendVerificationEmail(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      await this.authService.sendVerificationEmail(user.id, user.email, user.name);
      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  }
}

