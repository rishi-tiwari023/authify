import { AuthService } from '../AuthService';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { UserRole } from '../../model/User';
import * as bcrypt from 'bcrypt';

const userRepositoryMock = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const passwordResetTokenRepositoryMock = {
  deleteByUserId: jest.fn(),
  create: jest.fn(),
  findByToken: jest.fn(),
  markAsUsed: jest.fn(),
};

const emailVerificationTokenRepositoryMock = {
  deleteByUserId: jest.fn(),
  create: jest.fn(),
  findByToken: jest.fn(),
  markAsUsed: jest.fn(),
};

const emailServiceMock = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../repository/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => userRepositoryMock),
}));

jest.mock('../../repository/PasswordResetTokenRepository', () => ({
  PasswordResetTokenRepository: jest.fn().mockImplementation(() => passwordResetTokenRepositoryMock),
}));

jest.mock('../../repository/EmailVerificationTokenRepository', () => ({
  EmailVerificationTokenRepository: jest.fn().mockImplementation(() => emailVerificationTokenRepositoryMock),
}));

jest.mock('../EmailService', () => ({
  EmailService: jest.fn().mockImplementation(() => emailServiceMock),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('throws ValidationError for invalid email', async () => {
      const service = new AuthService();
      await expect(
        service.signup({ name: 'Test User', email: 'invalid', password: 'Password1!' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid password', async () => {
      const service = new AuthService();
      await expect(
        service.signup({ name: 'Test User', email: 'test@example.com', password: 'weak' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid name', async () => {
      const service = new AuthService();
      await expect(
        service.signup({ name: 'A', email: 'test@example.com', password: 'Password1!' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError when email already exists', async () => {
      const service = new AuthService();
      userRepositoryMock.findByEmail.mockResolvedValueOnce({ id: 'existing', email: 'test@example.com' });

      await expect(
        service.signup({ name: 'Test User', email: 'test@example.com', password: 'Password1!' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('creates user and sends welcome email for valid input', async () => {
      const service = new AuthService();
      userRepositoryMock.findByEmail.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashedPassword');
      const createdUser = {
        id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.USER,
        emailVerified: false,
        toSafeJSON: () => ({ id: 'u1', name: 'Test User', email: 'test@example.com', role: UserRole.USER, emailVerified: false }),
      };
      userRepositoryMock.create.mockResolvedValueOnce(createdUser);
      emailVerificationTokenRepositoryMock.deleteByUserId.mockResolvedValueOnce(undefined);
      emailVerificationTokenRepositoryMock.create.mockResolvedValueOnce({ token: 'token', userId: 'u1' });

      const result = await service.signup({ name: 'Test User', email: 'test@example.com', password: 'Password1!' });

      expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password1!', 10);
      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(emailServiceMock.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', 'Test User');
      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    it('throws ValidationError for invalid email', async () => {
      const service = new AuthService();
      await expect(
        service.login({ email: 'invalid', password: 'Password1!' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('returns null for non-existent user', async () => {
      const service = new AuthService();
      userRepositoryMock.findByEmail.mockResolvedValueOnce(null);

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });

      expect(result).toBeNull();
    });

    it('returns null for incorrect password', async () => {
      const service = new AuthService();
      const user = {
        id: 'u1',
        email: 'test@example.com',
        password: 'hashedPassword',
      };
      userRepositoryMock.findByEmail.mockResolvedValueOnce(user);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.login({ email: 'test@example.com', password: 'WrongPassword1!' });

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith('WrongPassword1!', 'hashedPassword');
    });

    it('returns user for correct credentials', async () => {
      const service = new AuthService();
      const user = {
        id: 'u1',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: UserRole.USER,
      };
      userRepositoryMock.findByEmail.mockResolvedValueOnce(user);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login({ email: 'test@example.com', password: 'Password1!' });

      expect(result).toEqual(user);
      expect(bcrypt.compare).toHaveBeenCalledWith('Password1!', 'hashedPassword');
    });
  });

  describe('requestPasswordReset', () => {
    it('throws ValidationError for invalid email', async () => {
      const service = new AuthService();
      await expect(
        service.requestPasswordReset('invalid')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws NotFoundError for non-existent user', async () => {
      const service = new AuthService();
      userRepositoryMock.findByEmail.mockResolvedValueOnce(null);

      await expect(
        service.requestPasswordReset('test@example.com')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('creates reset token and sends email for valid user', async () => {
      const service = new AuthService();
      const user = {
        id: 'u1',
        email: 'test@example.com',
      };
      userRepositoryMock.findByEmail.mockResolvedValueOnce(user);
      passwordResetTokenRepositoryMock.deleteByUserId.mockResolvedValueOnce(undefined);
      const resetToken = {
        id: 'token1',
        token: 'reset-token',
        userId: 'u1',
        expiresAt: new Date(),
        used: false,
      };
      passwordResetTokenRepositoryMock.create.mockResolvedValueOnce(resetToken);

      const result = await service.requestPasswordReset('test@example.com');

      expect(passwordResetTokenRepositoryMock.deleteByUserId).toHaveBeenCalledWith('u1');
      expect(passwordResetTokenRepositoryMock.create).toHaveBeenCalled();
      expect(emailServiceMock.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result).toEqual(resetToken);
    });
  });

  describe('resetPassword', () => {
    it('throws ValidationError for invalid password', async () => {
      const service = new AuthService();
      await expect(
        service.resetPassword('token', 'weak')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid token', async () => {
      const service = new AuthService();
      passwordResetTokenRepositoryMock.findByToken.mockResolvedValueOnce(null);

      await expect(
        service.resetPassword('invalid-token', 'Password1!')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for used token', async () => {
      const service = new AuthService();
      const resetToken = {
        id: 'token1',
        token: 'reset-token',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 3600000),
        used: true,
      };
      passwordResetTokenRepositoryMock.findByToken.mockResolvedValueOnce(resetToken);

      await expect(
        service.resetPassword('reset-token', 'Password1!')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for expired token', async () => {
      const service = new AuthService();
      const resetToken = {
        id: 'token1',
        token: 'reset-token',
        userId: 'u1',
        expiresAt: new Date(Date.now() - 3600000),
        used: false,
      };
      passwordResetTokenRepositoryMock.findByToken.mockResolvedValueOnce(resetToken);

      await expect(
        service.resetPassword('reset-token', 'Password1!')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('resets password successfully for valid token', async () => {
      const service = new AuthService();
      const resetToken = {
        id: 'token1',
        token: 'reset-token',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 3600000),
        used: false,
      };
      passwordResetTokenRepositoryMock.findByToken.mockResolvedValueOnce(resetToken);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('newHashedPassword');
      userRepositoryMock.update.mockResolvedValueOnce(undefined);
      passwordResetTokenRepositoryMock.markAsUsed.mockResolvedValueOnce(undefined);

      await service.resetPassword('reset-token', 'NewPassword1!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword1!', 10);
      expect(userRepositoryMock.update).toHaveBeenCalledWith('u1', { password: 'newHashedPassword' });
      expect(passwordResetTokenRepositoryMock.markAsUsed).toHaveBeenCalledWith('token1');
    });
  });

  describe('sendVerificationEmail', () => {
    it('creates verification token and sends email', async () => {
      const service = new AuthService();
      emailVerificationTokenRepositoryMock.deleteByUserId.mockResolvedValueOnce(undefined);
      const verificationToken = {
        id: 'token1',
        token: 'verification-token',
        userId: 'u1',
        expiresAt: new Date(),
        used: false,
      };
      emailVerificationTokenRepositoryMock.create.mockResolvedValueOnce(verificationToken);

      const result = await service.sendVerificationEmail('u1', 'test@example.com', 'Test User');

      expect(emailVerificationTokenRepositoryMock.deleteByUserId).toHaveBeenCalledWith('u1');
      expect(emailVerificationTokenRepositoryMock.create).toHaveBeenCalled();
      expect(emailServiceMock.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toEqual(verificationToken);
    });
  });

  describe('verifyEmail', () => {
    it('throws ValidationError for invalid token', async () => {
      const service = new AuthService();
      emailVerificationTokenRepositoryMock.findByToken.mockResolvedValueOnce(null);

      await expect(
        service.verifyEmail('invalid-token')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for used token', async () => {
      const service = new AuthService();
      const verificationToken = {
        id: 'token1',
        token: 'verification-token',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 86400000),
        used: true,
      };
      emailVerificationTokenRepositoryMock.findByToken.mockResolvedValueOnce(verificationToken);

      await expect(
        service.verifyEmail('verification-token')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for expired token', async () => {
      const service = new AuthService();
      const verificationToken = {
        id: 'token1',
        token: 'verification-token',
        userId: 'u1',
        expiresAt: new Date(Date.now() - 86400000),
        used: false,
      };
      emailVerificationTokenRepositoryMock.findByToken.mockResolvedValueOnce(verificationToken);

      await expect(
        service.verifyEmail('verification-token')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('verifies email successfully for valid token', async () => {
      const service = new AuthService();
      const verificationToken = {
        id: 'token1',
        token: 'verification-token',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 86400000),
        used: false,
      };
      emailVerificationTokenRepositoryMock.findByToken.mockResolvedValueOnce(verificationToken);
      userRepositoryMock.update.mockResolvedValueOnce(undefined);
      emailVerificationTokenRepositoryMock.markAsUsed.mockResolvedValueOnce(undefined);

      await service.verifyEmail('verification-token');

      expect(userRepositoryMock.update).toHaveBeenCalledWith('u1', { emailVerified: true });
      expect(emailVerificationTokenRepositoryMock.markAsUsed).toHaveBeenCalledWith('token1');
    });
  });
});

