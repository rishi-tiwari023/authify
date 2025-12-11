import { z } from 'zod';
import { UserRole } from '../model/User';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  email: z.string().trim().toLowerCase().email('Invalid email format').optional(),
  profileUrl: z
    .string()
    .trim()
    .url('Invalid URL format')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'Profile URL must use http or https',
    })
    .max(2048, 'Profile URL must be less than 2048 characters')
    .nullable()
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 chars and include uppercase, lowercase, number, and special character')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character'),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
    .refine(
      (val) => val === UserRole.USER || val === UserRole.ADMIN,
      { message: 'Role must be USER or ADMIN' }
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

