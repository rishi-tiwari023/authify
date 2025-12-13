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


