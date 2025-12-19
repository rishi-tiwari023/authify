import type { Response } from 'express';
import { SafeUser, UserRole } from '../../model/User';
import { AuthController } from '../../controller/AuthController';

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

describe('Integration: Auth and Password Reset flows', () => {
  beforeEach(() => {
    users.splice(0, users.length);
    resetTokens.splice(0, resetTokens.length);
    verificationTokens.splice(0, verificationTokens.length);
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
  });

  it('completes signup then login returning tokens and persisted user state', async () => {
    const controller = new AuthController();
    const signupRes = await signupUser(controller, {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password1!',
    });

    expect(signupRes.status).toHaveBeenCalledWith(201);
    const signupPayload = signupRes.json.mock.calls[0][0];
    expect(signupPayload.token).toBeDefined();
    expect(signupPayload.refreshToken).toBeDefined();
    expect(users).toHaveLength(1);
    expect(users[0].password).toBe('hashed-Password1!');
    expect(activityLogMock).toHaveBeenCalled();

    const loginRes = createMockResponse();
    await controller.login(
      { body: { email: 'jane@example.com', password: 'Password1!' }, headers: {}, ip: '127.0.0.1' } as any,
      asExpressResponse(loginRes)
    );

    const loginPayload = loginRes.json.mock.calls[0][0];
    expect(loginPayload.token).toBeDefined();
    expect(loginPayload.refreshToken).toBeDefined();
    expect(loginPayload.user.email).toBe('jane@example.com');
  });

  it('allows requesting and completing a password reset flow', async () => {
    const controller = new AuthController();

    // Seed user through signup
    await signupUser(controller, {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password1!',
    });

    const forgotRes = createMockResponse();
    await controller.forgotPassword({ body: { email: 'john@example.com' } } as any, asExpressResponse(forgotRes));

    expect(forgotRes.json).toHaveBeenCalledWith({
      message: 'If the email exists, a password reset link has been sent',
    });
    expect(resetTokens).toHaveLength(1);

    const resetToken = resetTokens[0].token;
    const resetRes = createMockResponse();
    await controller.resetPassword(
      { body: { token: resetToken, newPassword: 'NewPassword1!' } } as any,
      asExpressResponse(resetRes)
    );

    expect(resetRes.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    expect(resetTokens[0].used).toBe(true);

    const loginRes = createMockResponse();
    await controller.login(
      { body: { email: 'john@example.com', password: 'NewPassword1!' }, headers: {}, ip: '127.0.0.1' } as any,
      asExpressResponse(loginRes)
    );

    expect(loginRes.json).toHaveBeenCalled();
    const payload = loginRes.json.mock.calls[0][0];
    expect(payload.token).toBeDefined();
    expect(payload.user.email).toBe('john@example.com');
  });

  it('allows refreshing access token using refresh token', async () => {
    const controller = new AuthController();
    
    // Signup to get initial tokens
    const signupRes = await signupUser(controller, {
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'Password1!',
    });
    
    expect(signupRes.status).toHaveBeenCalledWith(201);
    const signupPayload = signupRes.json.mock.calls[0][0];
    const originalRefreshToken = signupPayload.refreshToken;
    expect(originalRefreshToken).toBeDefined();
    
    // Use refresh token to get new access token
    const refreshRes = createMockResponse();
    await controller.refreshToken(
      { body: { refreshToken: originalRefreshToken } } as any,
      asExpressResponse(refreshRes)
    );
    
    expect(refreshRes.json).toHaveBeenCalled();
    const refreshPayload = refreshRes.json.mock.calls[0][0];
    expect(refreshPayload.token).toBeDefined();
    expect(refreshPayload.refreshToken).toBeDefined();
    expect(refreshPayload.user.email).toBe('alice@example.com');
    expect(refreshPayload.refreshToken).not.toBe(originalRefreshToken);
  });

  it('returns current user information via me endpoint', async () => {
    const controller = new AuthController();
    
    // Signup to create user and get token
    const signupRes = await signupUser(controller, {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      password: 'Password1!',
    });
    
    const signupPayload = signupRes.json.mock.calls[0][0];
    const accessToken = signupPayload.token;
    
    // Mock auth middleware by directly calling me with user info
    const meRes = createMockResponse();
    const mockReq = {
      user: {
        id: signupPayload.user.id,
        email: signupPayload.user.email,
        role: signupPayload.user.role,
      },
    } as any;
    
    await controller.me(mockReq, asExpressResponse(meRes));
    
    expect(meRes.json).toHaveBeenCalled();
    const mePayload = meRes.json.mock.calls[0][0];
    expect(mePayload.id).toBe(signupPayload.user.id);
    expect(mePayload.email).toBe('bob@example.com');
    expect(mePayload.name).toBe('Bob Johnson');
    expect(mePayload.role).toBeDefined();
  });

  it('rejects invalid refresh token when attempting to refresh', async () => {
    const controller = new AuthController();
    
    const refreshRes = createMockResponse();
    await controller.refreshToken(
      { body: { refreshToken: 'invalid-refresh-token' } } as any,
      asExpressResponse(refreshRes)
    );
    
    expect(refreshRes.status).toHaveBeenCalledWith(500);
  });
});


