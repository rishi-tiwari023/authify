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
