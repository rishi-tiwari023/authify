import { z } from 'zod';

const passwordRules =
  'Password must be at least 8 chars and include uppercase, lowercase, number, and special character';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z
    .string()
    .min(8, passwordRules)
    .regex(/[A-Z]/, passwordRules)
    .regex(/[a-z]/, passwordRules)
    .regex(/[0-9]/, passwordRules)
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, passwordRules),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  newPassword: signupSchema.shape.password,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification token is required'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// Two-Factor Authentication Schemas

export const setup2FASchema = z.object({
  // No input needed - uses authenticated user's ID from token
});

export const enable2FASchema = z.object({
  token: z
    .string()
    .length(6, '2FA token must be exactly 6 digits')
    .regex(/^\d{6}$/, '2FA token must contain only digits'),
});

export const verify2FASchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  token: z
    .string()
    .min(6, '2FA token must be at least 6 characters')
    .max(20, '2FA token is too long'),
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required to disable 2FA'),
});

export const regenerateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required to regenerate backup codes'),
});

// Two-Factor Authentication Types
export type Setup2FAInput = z.infer<typeof setup2FASchema>;
export type Enable2FAInput = z.infer<typeof enable2FASchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type RegenerateBackupCodesInput = z.infer<typeof regenerateBackupCodesSchema>;



