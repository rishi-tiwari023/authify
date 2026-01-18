import { Request, Response } from 'express';
import { AuthService } from '../service/AuthService';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions, Secret } from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserRepository } from '../repository/UserRepository';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { RefreshTokenInput } from '../validation/authSchemas';
import { User, UserRole } from '../model/User';
import { UserService } from '../service/UserService';
import { ActivityLogService } from '../service/ActivityLogService';
import { safeLogActivity } from '../utils/activityLogger';
import { handleControllerError } from '../utils/controller';

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

      safeLogActivity(this.activityLogService, { userId: user.id, action: 'signup', req });

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
      handleControllerError(res, error, 400, (error as Error).message);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const result = await this.authService.login({ email, password });
      if (!result) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Handle 2FA requirement
      if ('requires2FA' in result && result.requires2FA) {
        safeLogActivity(this.activityLogService, {
          userId: result.userId,
          action: 'login_2fa_required',
          req
        });

        res.json({
          requires2FA: true,
          userId: result.userId
        });
        return;
      }

      const user = result as User;

      if (user.isBanned) {
        res.status(403).json({ error: 'Account is banned' });
        return;
      }


      const token = this.signToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = this.signRefreshToken({ id: user.id, email: user.email, role: user.role });

      safeLogActivity(this.activityLogService, { userId: user.id, action: 'login', req });

      res.status(200).json({
        user: user.toSafeJSON(),
        token,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Login failed');
    }
  }

  async setup2FA(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await this.authService.setup2FA(req.user.id);

      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'setup_2fa_initiated',
        req
      });

      res.json(result);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to setup 2FA');
    }
  }

  async enable2FA(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      const backupCodes = await this.authService.enable2FA(req.user.id, token);

      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'enable_2fa_completed',
        req
      });

      res.json({ backupCodes });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to enable 2FA');
    }
  }

  async verify2FA(req: Request, res: Response): Promise<void> {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        res.status(400).json({ error: 'User ID and token are required' });
        return;
      }

      const user = await this.authService.verifyLoginWith2FA(userId, token);
      if (!user) {
        res.status(401).json({ error: 'Invalid verification code' });
        return;
      }

      const authToken = this.signToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = this.signRefreshToken({ id: user.id, email: user.email, role: user.role });

      safeLogActivity(this.activityLogService, {
        userId: user.id,
        action: 'login_2fa_verification_success',
        req
      });

      res.json({
        user: user.toSafeJSON(),
        token: authToken,
        refreshToken,
      });

    } catch (error) {
      handleControllerError(res, error, 500, 'Failed to verify 2FA');
    }
  }

  async disable2FA(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { password } = req.body;
      if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
      }

      await this.authService.disable2FA(req.user.id, password);

      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'disable_2fa',
        req
      });

      res.json({ message: '2FA disabled successfully' });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to disable 2FA');
    }
  }

  async regenerateBackupCodes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { password } = req.body;
      if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
      }

      const user = await this.userRepository.findById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ error: 'Invalid password' });
        return;
      }

      const backupCodes = await this.authService.regenerateBackupCodes(req.user.id);

      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'regenerate_backup_codes',
        req
      });

      res.json({ backupCodes });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to regenerate backup codes');
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
      handleControllerError(res, error, 500, 'Failed to fetch users');
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
      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'update_user_role',
        req,
        metadata: { targetUserId: userId, role },
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to update user role');
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
      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'delete_user',
        req,
        metadata: { targetUserId: userId },
      });
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to delete user');
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
      handleControllerError(res, error, 500, 'Failed to refresh token');
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
      handleControllerError(res, error, 500, 'Failed to process password reset request');
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
      handleControllerError(res, error, 500, 'Failed to reset password');
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
      handleControllerError(res, error, 500, 'Failed to verify email');
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
      handleControllerError(res, error, 500, 'Failed to send verification email');
    }
  }
}

