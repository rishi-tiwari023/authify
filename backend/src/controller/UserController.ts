import { Response } from 'express';
import type { Express } from 'express';
import { UserService } from '../service/UserService';
import { AuthRequest } from '../middleware/authMiddleware';
import { ValidationError } from '../utils/errors';
import { isValidPassword } from '../utils/validation';
import path from 'path';
import { ActivityLogService } from '../service/ActivityLogService';
import { safeLogActivity } from '../utils/activityLogger';
import { handleControllerError } from '../utils/controller';

export class UserController {
  private userService: UserService;
  private activityLogService: ActivityLogService;

  constructor() {
    this.userService = new UserService();
    this.activityLogService = new ActivityLogService();
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await this.userService.getUserById(req.user.id);
      res.json(user);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { name, email, profileUrl } = req.body;
      const updatedUser = await this.userService.updateProfile(req.user.id, {
        name,
        email,
        profileUrl,
      });

      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'update_profile',
        req,
        metadata: { name, email, profileUrl },
      });
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to update profile');
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }

      // Validate new password
      const passwordValidation = isValidPassword(newPassword);
      if (!passwordValidation.valid) {
        res.status(400).json({ error: passwordValidation.error });
        return;
      }

      await this.userService.changePassword(req.user.id, {
        currentPassword,
        newPassword,
      });

      safeLogActivity(this.activityLogService, { userId: req.user.id, action: 'change_password', req });
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to change password');
    }
  }

  async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await this.userService.deleteUser(req.user.id);
      safeLogActivity(this.activityLogService, { userId: req.user.id, action: 'delete_account', req });
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      handleControllerError(res, error, 500, 'Failed to delete account');
    }
  }

  async uploadProfilePicture(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const file = (req as AuthRequest & { file?: Express.Multer.File }).file;

      if (!file) {
        res.status(400).json({ error: 'Profile picture file is required' });
        return;
      }

      const filename = path.basename(file.path);
      const publicPath = `/uploads/profile-pictures/${filename}`;
      const updated = await this.userService.updateProfilePicture(req.user.id, publicPath);
      safeLogActivity(this.activityLogService, {
        userId: req.user.id,
        action: 'upload_profile_picture',
        req,
        metadata: { path: publicPath },
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      handleControllerError(res, error, 500, 'Failed to upload profile picture');
    }
  }
}

