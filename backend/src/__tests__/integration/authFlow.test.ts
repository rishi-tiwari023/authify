import { UserRole } from '../../model/User';
import { AuthController } from '../../controller/AuthController';

// In-memory stores to simulate persistence across service calls
const users: any[] = [];
const resetTokens: any[] = [];
const verificationTokens: any[] = [];

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
      async create(data: any) {
        const user = {
          id: `user-${users.length + 1}`,
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role ?? UserRole.USER,
          emailVerified: data.emailVerified ?? false,
          profileUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          toSafeJSON() {
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
      async update(id: string, data: any) {
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
      async create(data: any) {
        const token = {
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
        for (let i = resetTokens.length - 1; i >= 0; i -= 1) {
          if (resetTokens[i].userId === userId) {
            resetTokens.splice(i, 1);
          }
        }
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
        for (let i = verificationTokens.length - 1; i >= 0; i -= 1) {
          if (verificationTokens[i].userId === userId) {
            verificationTokens.splice(i, 1);
          }
        }
      },
      async create(data: any) {
        const token = {
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

const createMockResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as any;
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
    const signupRes = createMockResponse();

    await controller.signup(
      {
        body: { name: 'Jane Doe', email: 'jane@example.com', password: 'Password1!' },
        headers: {},
        ip: '127.0.0.1',
      } as any,
      signupRes
    );

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
      loginRes
    );

    const loginPayload = loginRes.json.mock.calls[0][0];
    expect(loginPayload.token).toBeDefined();
    expect(loginPayload.refreshToken).toBeDefined();
    expect(loginPayload.user.email).toBe('jane@example.com');
  });

  it('allows requesting and completing a password reset flow', async () => {
    const controller = new AuthController();

    // Seed user through signup
    await controller.signup(
      {
        body: { name: 'John Doe', email: 'john@example.com', password: 'Password1!' },
        headers: {},
        ip: '127.0.0.1',
      } as any,
      createMockResponse()
    );

    const forgotRes = createMockResponse();
    await controller.forgotPassword({ body: { email: 'john@example.com' } } as any, forgotRes);

    expect(forgotRes.json).toHaveBeenCalledWith({
      message: 'If the email exists, a password reset link has been sent',
    });
    expect(resetTokens).toHaveLength(1);

    const resetToken = resetTokens[0].token;
    const resetRes = createMockResponse();
    await controller.resetPassword(
      { body: { token: resetToken, newPassword: 'NewPassword1!' } } as any,
      resetRes
    );

    expect(resetRes.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    expect(resetTokens[0].used).toBe(true);

    const loginRes = createMockResponse();
    await controller.login(
      { body: { email: 'john@example.com', password: 'NewPassword1!' }, headers: {}, ip: '127.0.0.1' } as any,
      loginRes
    );

    expect(loginRes.json).toHaveBeenCalled();
    const payload = loginRes.json.mock.calls[0][0];
    expect(payload.token).toBeDefined();
    expect(payload.user.email).toBe('john@example.com');
  });
});


