import { Router } from 'express';
import { UserController } from '../controller/UserController';
import { AuthRequest, authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { updateProfileSchema, changePasswordSchema } from '../validation/userSchemas';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const userController = new UserController();
const authenticatedUserRateLimit = rateLimitMiddleware({
  maxRequests: 60,
  windowMs: 60000,
  keyGenerator: (req) => (req as AuthRequest).user?.id || req.ip,
});

const uploadsDir = path.resolve(process.cwd(), 'uploads/profile-pictures');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeName}`;
      cb(null, unique);
    },
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
});

/**
 * @route GET /api/user/profile
 * @desc Get user's profile information
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.get('/profile', authMiddleware, authenticatedUserRateLimit, (req, res) => userController.getProfile(req as any, res));

/**
 * @route PUT /api/user/profile
 * @desc Update user's profile information
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} [name] - User's full name
 * @body {string} [email] - User's email address
 * @body {string} [profileUrl] - User's profile picture URL
 */
router.put('/profile', authMiddleware, authenticatedUserRateLimit, validateBody(updateProfileSchema), (req, res) => userController.updateProfile(req as any, res));

/**
 * @route PUT /api/user/password
 * @desc Change user's password
 * @access Private
 * @header Authorization: Bearer <token>
 * @body {string} currentPassword - User's current password
 * @body {string} newPassword - User's new password (min 8 chars, must contain uppercase, lowercase, and number)
 */
router.put('/password', authMiddleware, authenticatedUserRateLimit, validateBody(changePasswordSchema), (req, res) => userController.changePassword(req as any, res));

/**
 * @route DELETE /api/user/account
 * @desc Delete user's account
 * @access Private
 * @header Authorization: Bearer <token>
 */
router.delete('/account', authMiddleware, authenticatedUserRateLimit, (req, res) => userController.deleteAccount(req as any, res));

/**
 * @route POST /api/user/profile/picture
 * @desc Upload and set user's profile picture
 * @access Private
 * @header Authorization: Bearer <token>
 * @form-data file - Image file
 */
router.post(
  '/profile/picture',
  authMiddleware,
  authenticatedUserRateLimit,
  (req, res, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Failed to upload file' });
        return;
      }
      next();
    });
  },
  (req, res) => userController.uploadProfilePicture(req as any, res)
);

export default router;

