import { Request, Response } from 'express';
import { AuthController } from '../AuthController';
import { AuthService } from '../../service/AuthService';
import { UserService } from '../../service/UserService';
import { UserRepository } from '../../repository/UserRepository';
import { ActivityLogService } from '../../service/ActivityLogService';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { UserRole } from '../../model/User';
import jwt from 'jsonwebtoken';

// Mock dependencies
const authServiceMock = {
  signup: jest.fn(),
  login: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  sendVerificationEmail: jest.fn(),
  verifyEmail: jest.fn(),
};

const userServiceMock = {
  listUsers: jest.fn(),
  updateUserRole: jest.fn(),
  deleteUser: jest.fn(),
};

const userRepositoryMock = {
  findById: jest.fn(),
};

const activityLogServiceMock = {
  log: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../service/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => authServiceMock),
}));

jest.mock('../../service/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => userServiceMock),
}));

jest.mock('../../repository/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => userRepositoryMock),
}));

jest.mock('../../service/ActivityLogService', () => ({
  ActivityLogService: jest.fn().mockImplementation(() => activityLogServiceMock),
}));

// Set up environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

describe('AuthController', () => {
  let controller: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController();

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockRequest = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };
  });

  describe('signup', () => {
    it('returns 400 when required fields are missing', async () => {
      mockRequest.body = { name: 'Test User' };

      await controller.signup(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('returns 400 when AuthService throws ValidationError', async () => {
      mockRequest.body = { name: 'Test User', email: 'test@example.com', password: 'Password1!' };
      authServiceMock.signup.mockRejectedValueOnce(new ValidationError('Email already exists'));

      await controller.signup(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email already exists' });
    });

    it('creates user and returns token on successful signup', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        emailVerified: false,
        toSafeJSON: () => ({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.USER,
          emailVerified: false,
        }),
      };
      mockRequest.body = { name: 'Test User', email: 'test@example.com', password: 'Password1!' };
      authServiceMock.signup.mockResolvedValueOnce(user);

      await controller.signup(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
          token: expect.any(String),
          refreshToken: expect.any(String),
        })
      );
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns 400 when email or password is missing', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await controller.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email and password required' });
    });

    it('returns 401 when credentials are invalid', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'WrongPassword1!' };
      authServiceMock.login.mockResolvedValueOnce(null);

      await controller.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('returns token on successful login', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.USER,
        toSafeJSON: () => ({
          id: 'user-1',
          email: 'test@example.com',
          role: UserRole.USER,
        }),
      };
      mockRequest.body = { email: 'test@example.com', password: 'Password1!' };
      authServiceMock.login.mockResolvedValueOnce(user);

      await controller.login(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object),
          token: expect.any(String),
          refreshToken: expect.any(String),
        })
      );
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns 401 when user is not authenticated', async () => {
      const authRequest = { ...mockRequest, user: undefined } as any;

      await controller.me(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 404 when user is not found', async () => {
      const authRequest = {
        ...mockRequest,
        user: { id: 'user-1', email: 'test@example.com', role: UserRole.USER },
      } as any;
      userRepositoryMock.findById.mockResolvedValueOnce(null);

      await controller.me(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('returns user data when authenticated', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        toSafeJSON: () => ({ id: 'user-1', email: 'test@example.com', role: UserRole.USER }),
      };
      const authRequest = {
        ...mockRequest,
        user: { id: 'user-1', email: 'test@example.com', role: UserRole.USER },
      } as any;
      userRepositoryMock.findById.mockResolvedValueOnce(user);

      await controller.me(authRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(user.toSafeJSON());
    });
  });

  describe('refreshToken', () => {
    it('returns 401 when refresh token is invalid', async () => {
      mockRequest.body = { refreshToken: 'invalid-token' };

      await controller.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('returns new tokens on valid refresh token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.USER,
        toSafeJSON: () => ({ id: 'user-1', email: 'test@example.com', role: UserRole.USER }),
      };
      const refreshToken = jwt.sign({ id: 'user-1', email: 'test@example.com', role: UserRole.USER }, 'test-refresh-secret');
      mockRequest.body = { refreshToken };
      userRepositoryMock.findById.mockResolvedValueOnce(user);

      await controller.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.any(Object),
        })
      );
    });
  });

  describe('forgotPassword', () => {
    it('returns 400 when email is missing', async () => {
      mockRequest.body = {};

      await controller.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email is required' });
    });

    it('returns success message even when email does not exist', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };
      authServiceMock.requestPasswordReset.mockRejectedValueOnce(new NotFoundError('User not found'));

      await controller.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'If the email exists, a password reset link has been sent',
      });
    });

    it('returns success message on valid email', async () => {
      mockRequest.body = { email: 'test@example.com' };
      authServiceMock.requestPasswordReset.mockResolvedValueOnce({});

      await controller.forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'If the email exists, a password reset link has been sent',
      });
    });
  });

  describe('resetPassword', () => {
    it('returns 400 when token or password is missing', async () => {
      mockRequest.body = { token: 'reset-token' };

      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Token and new password are required' });
    });

    it('returns 400 when token is invalid', async () => {
      mockRequest.body = { token: 'invalid-token', newPassword: 'NewPassword1!' };
      authServiceMock.resetPassword.mockRejectedValueOnce(new ValidationError('Invalid token'));

      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('returns success on valid reset', async () => {
      mockRequest.body = { token: 'valid-token', newPassword: 'NewPassword1!' };
      authServiceMock.resetPassword.mockResolvedValueOnce(undefined);

      await controller.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Password reset successfully' });
    });
  });

  describe('verifyEmail', () => {
    it('returns 400 when token is missing', async () => {
      mockRequest.body = {};

      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Verification token is required' });
    });

    it('returns 400 when token is invalid', async () => {
      mockRequest.body = { token: 'invalid-token' };
      authServiceMock.verifyEmail.mockRejectedValueOnce(new ValidationError('Invalid token'));

      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('returns success on valid verification', async () => {
      mockRequest.body = { token: 'valid-token' };
      authServiceMock.verifyEmail.mockResolvedValueOnce(undefined);

      await controller.verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Email verified successfully' });
    });
  });

  describe('resendVerificationEmail', () => {
    it('returns 401 when not authenticated', async () => {
      const authRequest = { ...mockRequest, user: undefined } as any;

      await controller.resendVerificationEmail(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 400 when email is already verified', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
      };
      const authRequest = {
        ...mockRequest,
        user: { id: 'user-1', email: 'test@example.com', role: UserRole.USER },
      } as any;
      userRepositoryMock.findById.mockResolvedValueOnce(user);

      await controller.resendVerificationEmail(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email is already verified' });
    });

    it('sends verification email successfully', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
      };
      const authRequest = {
        ...mockRequest,
        user: { id: 'user-1', email: 'test@example.com', role: UserRole.USER },
      } as any;
      userRepositoryMock.findById.mockResolvedValueOnce(user);
      authServiceMock.sendVerificationEmail.mockResolvedValueOnce(undefined);

      await controller.resendVerificationEmail(authRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Verification email sent successfully' });
    });
  });

  describe('listUsers', () => {
    it('returns paginated users list', async () => {
      const users = {
        data: [{ id: 'user-1', email: 'test@example.com' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockRequest.query = { page: '1', limit: '20' };
      userServiceMock.listUsers.mockResolvedValueOnce(users);

      await controller.listUsers(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(users);
    });
  });

  describe('updateUserRole', () => {
    it('returns 401 when not authenticated', async () => {
      const authRequest = { ...mockRequest, user: undefined } as any;

      await controller.updateUserRole(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('returns 403 when user is not admin', async () => {
      const authRequest = {
        ...mockRequest,
        user: { id: 'user-1', email: 'test@example.com', role: UserRole.USER },
        params: { userId: 'user-2' },
        body: { role: UserRole.ADMIN },
      } as any;

      await controller.updateUserRole(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('updates user role successfully', async () => {
      const updatedUser = { id: 'user-2', role: UserRole.ADMIN };
      const authRequest = {
        ...mockRequest,
        user: { id: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN },
        params: { userId: 'user-2' },
        body: { role: UserRole.ADMIN },
      } as any;
      userServiceMock.updateUserRole.mockResolvedValueOnce(updatedUser);

      await controller.updateUserRole(authRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(updatedUser);
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('returns 401 when not authenticated', async () => {
      const authRequest = { ...mockRequest, user: undefined } as any;

      await controller.deleteUser(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('returns 403 when user is not admin', async () => {
      const authRequest = {
        ...mockRequest,
        user: { id: 'user-1', email: 'test@example.com', role: UserRole.USER },
        params: { userId: 'user-2' },
      } as any;

      await controller.deleteUser(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('returns 400 when admin tries to delete own account', async () => {
      const authRequest = {
        ...mockRequest,
        user: { id: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN },
        params: { userId: 'admin-1' },
      } as any;

      await controller.deleteUser(authRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('deletes user successfully', async () => {
      const authRequest = {
        ...mockRequest,
        user: { id: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN },
        params: { userId: 'user-2' },
      } as any;
      userServiceMock.deleteUser.mockResolvedValueOnce(undefined);

      await controller.deleteUser(authRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'User deleted successfully' });
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });
});

