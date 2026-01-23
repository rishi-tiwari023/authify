import type { Response } from 'express';
import { SafeUser, UserRole } from '../../model/User';
import { AuthController } from '../../controller/AuthController';
import { UserController } from '../../controller/UserController';

type StoredUser = SafeUser & { password: string; toSafeJSON(): SafeUser };
type TokenRecord = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

// In-memory stores to simulate persistence across service calls
const users: StoredUser[] = [];
const resetTokens: TokenRecord[] = [];
const verificationTokens: TokenRecord[] = [];

const pruneByUserId = (store: TokenRecord[], userId: string) => {
  for (let i = store.length - 1; i >= 0; i -= 1) {
    if (store[i].userId === userId) {
      store.splice(i, 1);
    }
  }
};

const emailServiceMock = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const activityLogMock = jest.fn().mockResolvedValue(undefined);

// Mock TwoFactorService to avoid crypto dependencies
jest.mock('../../service/TwoFactorService', () => {
  return {
    TwoFactorService: jest.fn().mockImplementation(() => ({
      generateSecret: jest.fn().mockReturnValue({ base32: 'SECRET', otpauth_url: 'otpauth://...' }),
      generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
      encryptSecret: jest.fn().mockReturnValue('encrypted-secret'),
      decryptSecret: jest.fn().mockReturnValue('decrypted-secret'),
      verifyToken: jest.fn().mockReturnValue(true),
      generateBackupCodes: jest.fn().mockReturnValue(['backup1', 'backup2']),
      verifyBackupCode: jest.fn().mockReturnValue(true),
      removeBackupCode: jest.fn().mockReturnValue([]),
    })),
  };
});

// Mock jsonwebtoken to avoid crypto dependency issues
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 'user-1', role: 'USER', email: 'test@example.com' }),
}));

// Replace repositories and services with in-memory implementations
jest.mock('../../repository/UserRepository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => ({
      async findByEmail(email: string) {
        return users.find((u) => u.email === email) ?? null;
      },
      async findById(id: string) {
        return users.find((u) => u.id === id) ?? null;
      },
      async create(data: {
        name: string;
        email: string;
        password: string;
        role?: UserRole;
        emailVerified?: boolean;
        profileUrl?: string | null;
        isBanned?: boolean;
        createdAt?: Date;
        updatedAt?: Date;
      }) {
        const user: StoredUser = {
          id: `user-${users.length + 1}`,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role ?? UserRole.USER,
          emailVerified: data.emailVerified ?? false,
          isBanned: data.isBanned ?? false,
          twoFactorEnabled: false,
          profileUrl: data.profileUrl ?? null,
          createdAt: data.createdAt ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
          toSafeJSON(): SafeUser {
            return {
              id: this.id,
              name: this.name,
              email: this.email,
              role: this.role,
              profileUrl: this.profileUrl,
              emailVerified: this.emailVerified,
              twoFactorEnabled: this.twoFactorEnabled,
              isBanned: this.isBanned,
              createdAt: this.createdAt,
              updatedAt: this.updatedAt,
            };
          },
        };
        users.push(user);
        return user;
      },
      async update(id: string, data: Partial<StoredUser>) {
        const existing = users.find((u) => u.id === id);
        if (!existing) return null;
        Object.assign(existing, data, { updatedAt: new Date() });
        return existing;
      },
      async delete(id: string) {
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) return false;
        users.splice(index, 1);
        return true;
      },
      async findPaginated() {
        return { data: users, total: users.length };
      },
    })),
  };
});

jest.mock('../../repository/PasswordResetTokenRepository', () => {
  return {
    PasswordResetTokenRepository: jest.fn().mockImplementation(() => ({
      async create(data: Omit<TokenRecord, 'id' | 'used' | 'createdAt'>) {
        const token: TokenRecord = {
          id: `reset-${resetTokens.length + 1}`,
          used: false,
          createdAt: new Date(),
          ...data,
        };
        resetTokens.push(token);
        return token;
      },
      async findByToken(token: string) {
        return resetTokens.find((t) => t.token === token) ?? null;
      },
      async markAsUsed(id: string) {
        const found = resetTokens.find((t) => t.id === id);
        if (found) {
          found.used = true;
        }
      },
      async deleteByUserId(userId: string) {
        pruneByUserId(resetTokens, userId);
      },
      async deleteExpiredTokens() {
        return;
      },
    })),
  };
});

jest.mock('../../repository/EmailVerificationTokenRepository', () => {
  return {
    EmailVerificationTokenRepository: jest.fn().mockImplementation(() => ({
      async deleteByUserId(userId: string) {
        pruneByUserId(verificationTokens, userId);
      },
      async create(data: Omit<TokenRecord, 'id' | 'used' | 'createdAt'>) {
        const token: TokenRecord = {
          id: `verify-${verificationTokens.length + 1}`,
          used: false,
          createdAt: new Date(),
          ...data,
        };
        verificationTokens.push(token);
        return token;
      },
      async findByToken(token: string) {
        return verificationTokens.find((t) => t.token === token) ?? null;
      },
      async markAsUsed(id: string) {
        const found = verificationTokens.find((t) => t.id === id);
        if (found) {
          found.used = true;
        }
      },
    })),
  };
});

jest.mock('../../service/EmailService', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => emailServiceMock),
  };
});

jest.mock('../../service/ActivityLogService', () => {
  return {
    ActivityLogService: jest.fn().mockImplementation(() => ({
      log: activityLogMock,
    })),
  };
});

// Use deterministic hashing to simplify flow assertions
jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed-${value}`),
  compare: jest.fn(async (value: string, hashed: string) => hashed === `hashed-${value}`),
}));

// Stable tokens for deterministic tests
jest.mock('crypto', () => ({
  randomBytes: (len: number) => Buffer.from(`token-${len}`),
}));

interface MockResponse {
  json: jest.Mock;
  status: jest.Mock;
}

const createMockResponse = (): MockResponse => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status };
};

const asExpressResponse = (res: MockResponse): Response => res as unknown as Response;

type SignupBody = { name: string; email: string; password: string };

const signupUser = async (controller: AuthController, body: SignupBody) => {
  const response = createMockResponse();
  await controller.signup(
    {
      body,
      headers: {},
      ip: '127.0.0.1',
    } as any,
    asExpressResponse(response)
  );
  return response;
};

describe('Integration: Profile Management', () => {
  let authController: AuthController;
  let userController: UserController;

  beforeEach(() => {
    users.splice(0, users.length);
    resetTokens.splice(0, resetTokens.length);
    verificationTokens.splice(0, verificationTokens.length);
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'test-encryption-key-must-be-32-b';
    authController = new AuthController();
    userController = new UserController();
  });

  it('allows authenticated user to retrieve their profile information', async () => {
    // Signup to create user
    const signupRes = await signupUser(authController, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password1!',
    });

    const signupPayload = signupRes.json.mock.calls[0][0];
    const userId = signupPayload.user.id;

    // Get profile
    const getProfileRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId,
        email: 'jane@example.com',
        role: UserRole.USER,
      },
    } as any;

    await userController.getProfile(mockReq, asExpressResponse(getProfileRes));

    expect(getProfileRes.json).toHaveBeenCalled();
    const profile = getProfileRes.json.mock.calls[0][0];
    expect(profile.id).toBe(userId);
    expect(profile.email).toBe('jane@example.com');
    expect(profile.name).toBe('Jane Doe');
  });

  it('allows authenticated user to update their profile name and email', async () => {
    // Signup to create user
    const signupRes = await signupUser(authController, {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password1!',
    });

    const signupPayload = signupRes.json.mock.calls[0][0];
    const userId = signupPayload.user.id;

    // Update profile
    const updateProfileRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId,
        email: 'john@example.com',
        role: UserRole.USER,
      },
      body: {
        name: 'John Smith',
        email: 'john.smith@example.com',
      },
    } as any;

    await userController.updateProfile(mockReq, asExpressResponse(updateProfileRes));

    expect(updateProfileRes.json).toHaveBeenCalled();
    const updatedProfile = updateProfileRes.json.mock.calls[0][0];
    expect(updatedProfile.name).toBe('John Smith');
    expect(updatedProfile.email).toBe('john.smith@example.com');
    expect(users.find((u) => u.id === userId)?.name).toBe('John Smith');
    expect(users.find((u) => u.id === userId)?.email).toBe('john.smith@example.com');
  });

  it('allows authenticated user to update their profile picture URL', async () => {
    // Signup to create user
    const signupRes = await signupUser(authController, {
      name: 'Alice Brown',
      email: 'alice@example.com',
      password: 'Password1!',
    });

    const signupPayload = signupRes.json.mock.calls[0][0];
    const userId = signupPayload.user.id;

    // Update profile with profile URL
    const updateProfileRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId,
        email: 'alice@example.com',
        role: UserRole.USER,
      },
      body: {
        profileUrl: 'https://example.com/avatar.jpg',
      },
    } as any;

    await userController.updateProfile(mockReq, asExpressResponse(updateProfileRes));

    expect(updateProfileRes.json).toHaveBeenCalled();
    const updatedProfile = updateProfileRes.json.mock.calls[0][0];
    expect(updatedProfile.profileUrl).toBe('https://example.com/avatar.jpg');
    expect(users.find((u) => u.id === userId)?.profileUrl).toBe('https://example.com/avatar.jpg');
  });

  it('allows authenticated user to change their password with correct current password', async () => {
    // Signup to create user
    const signupRes = await signupUser(authController, {
      name: 'Bob Wilson',
      email: 'bob@example.com',
      password: 'OldPassword1!',
    });

    const signupPayload = signupRes.json.mock.calls[0][0];
    const userId = signupPayload.user.id;
    const userBeforeChange = users.find((u) => u.id === userId);
    const oldPassword = userBeforeChange?.password;

    // Change password
    const changePasswordRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId,
        email: 'bob@example.com',
        role: UserRole.USER,
      },
      body: {
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword1!',
      },
    } as any;

    await userController.changePassword(mockReq, asExpressResponse(changePasswordRes));

    expect(changePasswordRes.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
    const userAfterChange = users.find((u) => u.id === userId);
    expect(userAfterChange?.password).toBe('hashed-NewPassword1!');
    expect(userAfterChange?.password).not.toBe(oldPassword);
  });

  it('rejects password change when current password is incorrect', async () => {
    // Signup to create user
    const signupRes = await signupUser(authController, {
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      password: 'CorrectPassword1!',
    });

    const signupPayload = signupRes.json.mock.calls[0][0];
    const userId = signupPayload.user.id;

    // Attempt to change password with wrong current password
    const changePasswordRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId,
        email: 'charlie@example.com',
        role: UserRole.USER,
      },
      body: {
        currentPassword: 'WrongPassword1!',
        newPassword: 'NewPassword1!',
      },
    } as any;

    await userController.changePassword(mockReq, asExpressResponse(changePasswordRes));

    expect(changePasswordRes.status).toHaveBeenCalledWith(401);
  });

  it('allows authenticated user to delete their own account', async () => {
    // Signup to create user
    const signupRes = await signupUser(authController, {
      name: 'David Miller',
      email: 'david@example.com',
      password: 'Password1!',
    });

    const signupPayload = signupRes.json.mock.calls[0][0];
    const userId = signupPayload.user.id;
    expect(users).toHaveLength(1);

    // Delete account
    const deleteAccountRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId,
        email: 'david@example.com',
        role: UserRole.USER,
      },
    } as any;

    await userController.deleteAccount(mockReq, asExpressResponse(deleteAccountRes));

    expect(deleteAccountRes.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
    expect(users).toHaveLength(0);
    expect(users.find((u) => u.id === userId)).toBeUndefined();
  });

  it('rejects profile update when email is already in use by another user', async () => {
    // Create two users
    const signupRes1 = await signupUser(authController, {
      name: 'User One',
      email: 'user1@example.com',
      password: 'Password1!',
    });
    const signupRes2 = await signupUser(authController, {
      name: 'User Two',
      email: 'user2@example.com',
      password: 'Password1!',
    });

    const userId1 = signupRes1.json.mock.calls[0][0].user.id;

    // Try to update user1's email to user2's email
    const updateProfileRes = createMockResponse();
    const mockReq = {
      user: {
        id: userId1,
        email: 'user1@example.com',
        role: UserRole.USER,
      },
      body: {
        email: 'user2@example.com',
      },
    } as any;

    await userController.updateProfile(mockReq, asExpressResponse(updateProfileRes));

    expect(updateProfileRes.status).toHaveBeenCalledWith(400);
  });
});
