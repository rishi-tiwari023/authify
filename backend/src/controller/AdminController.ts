import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserRepository } from '../repository/UserRepository';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ActivityLogService } from '../service/ActivityLogService';
import { safeLogActivity } from '../utils/activityLogger';
import { handleControllerError } from '../utils/controller';

export class AdminController {
    private userRepository: UserRepository;
    private activityLogService: ActivityLogService;

    constructor() {
        this.userRepository = new UserRepository();
        this.activityLogService = new ActivityLogService();
    }

    async getUser(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user = await this.userRepository.findById(id);

            if (!user) {
                throw new NotFoundError('User not found');
            }

            // Return full user details including metadata, but without password
            const userJSON = {
                ...user.toSafeJSON(),
                isBanned: user.isBanned, // Explicitly include restricted fields
            };

            res.json(userJSON);
        } catch (error) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            handleControllerError(res, error, 500, 'Failed to fetch user details');
        }
    }

    async deleteUser(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            // Prevent deleting self (though middleware should catch this if it's the logged in user, extra check is good)
            if (req.user?.id === id) {
                res.status(400).json({ error: 'Cannot delete your own admin account' });
                return;
            }

            await this.userRepository.delete(id);

            safeLogActivity(this.activityLogService, {
                userId: req.user!.id,
                action: 'admin_delete_user',
                req,
                metadata: { targetUserId: id },
            });

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            handleControllerError(res, error, 500, 'Failed to delete user');
        }
    }

    async banUser(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { isBanned } = req.body;

            if (typeof isBanned !== 'boolean') {
                res.status(400).json({ error: 'isBanned boolean field required' });
                return;
            }

            if (req.user?.id === id) {
                res.status(400).json({ error: 'Cannot ban your own admin account' });
                return;
            }

            const user = await this.userRepository.findById(id);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            user.isBanned = isBanned;
            await this.userRepository.save(user);

            safeLogActivity(this.activityLogService, {
                userId: req.user!.id,
                action: isBanned ? 'admin_ban_user' : 'admin_unban_user',
                req,
                metadata: { targetUserId: id },
            });

            res.json({
                message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
                user: { ...user.toSafeJSON(), isBanned: user.isBanned }
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            handleControllerError(res, error, 500, 'Failed to update ban status');
        }
    }
}
