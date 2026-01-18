import { Response } from 'express';
import { UserController } from '../UserController';
import { UserService } from '../../service/UserService';
import { ActivityLogService } from '../../service/ActivityLogService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ValidationError, UnauthorizedError } from '../../utils/errors';
import { UserRole } from '../../model/User';

// Mock dependencies
const userServiceMock = {
  getUserById: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  deleteUser: jest.fn(),
  updateProfilePicture: jest.fn(),
};

const activityLogServiceMock = {
  log: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../service/UserService', () => ({
  UserService: jest.fn().mockImplementation(() => userServiceMock),
}));

jest.mock('../../service/ActivityLogService', () => ({
  ActivityLogService: jest.fn().mockImplementation(() => activityLogServiceMock),
}));

describe('UserController', () => {
  let controller: UserController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserController();

    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockRequest = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.USER,
      },
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };
  });

  describe('getProfile', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 500 when UserService throws error', async () => {
      userServiceMock.getUserById.mockRejectedValueOnce(new Error('Database error'));

      await controller.getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to get profile' });
    });

    it('returns user profile successfully', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        emailVerified: false,
      };
      userServiceMock.getUserById.mockResolvedValueOnce(user);

      await controller.getProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(user);
    });
  });

  describe('updateProfile', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.updateProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 400 when UserService throws ValidationError', async () => {
      mockRequest.body = { email: 'invalid-email' };
      userServiceMock.updateProfile.mockRejectedValueOnce(new ValidationError('Invalid email format'));

      await controller.updateProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid email format' });
    });

    it('updates profile successfully', async () => {
      const updatedUser = {
        id: 'user-1',
        email: 'updated@example.com',
        name: 'Updated Name',
        role: UserRole.USER,
        emailVerified: false,
      };
      mockRequest.body = { name: 'Updated Name', email: 'updated@example.com' };
      userServiceMock.updateProfile.mockResolvedValueOnce(updatedUser);

      await controller.updateProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(updatedUser);
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.changePassword(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 400 when currentPassword or newPassword is missing', async () => {
      mockRequest.body = { currentPassword: 'OldPass1!' };

      await controller.changePassword(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Current password and new password are required',
      });
    });

    it('returns 400 when new password is invalid', async () => {
      mockRequest.body = { currentPassword: 'OldPass1!', newPassword: 'weak' };

      await controller.changePassword(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('returns 401 when current password is incorrect', async () => {
      mockRequest.body = { currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' };
      userServiceMock.changePassword.mockRejectedValueOnce(new UnauthorizedError('Current password is incorrect'));

      await controller.changePassword(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Current password is incorrect' });
    });

    it('changes password successfully', async () => {
      mockRequest.body = { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' };
      userServiceMock.changePassword.mockResolvedValueOnce(undefined);

      await controller.changePassword(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Password changed successfully' });
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.deleteAccount(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 500 when deletion fails', async () => {
      userServiceMock.deleteUser.mockRejectedValueOnce(new Error('Database error'));

      await controller.deleteAccount(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to delete account' });
    });

    it('deletes account successfully', async () => {
      userServiceMock.deleteUser.mockResolvedValueOnce(undefined);

      await controller.deleteAccount(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });

  describe('uploadProfilePicture', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await controller.uploadProfilePicture(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('returns 400 when file is missing', async () => {
      (mockRequest as any).file = undefined;

      await controller.uploadProfilePicture(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Profile picture file is required' });
    });

    it('returns 400 when UserService throws ValidationError', async () => {
      (mockRequest as any).file = { path: '/uploads/test.jpg' };
      userServiceMock.updateProfilePicture.mockRejectedValueOnce(new ValidationError('Invalid URL'));

      await controller.uploadProfilePicture(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid URL' });
    });

    it('uploads profile picture successfully', async () => {
      const updatedUser = {
        id: 'user-1',
        profileUrl: '/uploads/profile-pictures/test.jpg',
      };
      (mockRequest as any).file = { path: '/some/path/test.jpg' };
      userServiceMock.updateProfilePicture.mockResolvedValueOnce(updatedUser);

      await controller.uploadProfilePicture(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(updatedUser);
      expect(activityLogServiceMock.log).toHaveBeenCalled();
    });
  });
});

