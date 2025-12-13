import { UserService } from '../UserService';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../utils/errors';
import { UserRole } from '../../model/User';
import * as bcrypt from 'bcrypt';

const userRepositoryMock = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findPaginated: jest.fn(),
};

const passwordResetTokenRepositoryMock = {
  deleteByUserId: jest.fn(),
};

jest.mock('../../repository/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => userRepositoryMock),
}));

jest.mock('../../repository/PasswordResetTokenRepository', () => ({
  PasswordResetTokenRepository: jest.fn().mockImplementation(() => passwordResetTokenRepositoryMock),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('throws NotFoundError when user not found', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-1', { name: 'New Name' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ValidationError when email already in use', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'original@example.com',
      });
      userRepositoryMock.findByEmail.mockResolvedValue({
        id: 'user-2',
        email: 'existing@example.com',
      });

      await expect(
        service.updateProfile('user-1', { email: 'existing@example.com' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid email format', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'original@example.com',
      });

      await expect(
        service.updateProfile('user-1', { email: 'invalid-email' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid name', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await expect(
        service.updateProfile('user-1', { name: 'A' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for invalid profile URL', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await expect(
        service.updateProfile('user-1', { profileUrl: 'not-a-url' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('updates profile and returns safe user', async () => {
      const service = new UserService();
      const storedUser = {
        id: 'user-1',
        email: 'original@example.com',
        name: 'Original Name',
        emailVerified: false,
        toSafeJSON: () => ({ id: 'user-1', email: 'updated@example.com', name: 'Updated Name', role: UserRole.USER, emailVerified: false }),
      };
      userRepositoryMock.findById.mockResolvedValue(storedUser);
      userRepositoryMock.findByEmail.mockResolvedValue(null);
      userRepositoryMock.update.mockResolvedValue({
        ...storedUser,
        email: 'updated@example.com',
        name: 'Updated Name',
        toSafeJSON: () => ({ id: 'user-1', email: 'updated@example.com', name: 'Updated Name', role: UserRole.USER, emailVerified: false }),
      });

      const result = await service.updateProfile('user-1', { email: 'updated@example.com', name: 'Updated Name' });

      expect(userRepositoryMock.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ email: 'updated@example.com', name: 'Updated Name' }));
      expect(result.email).toBe('updated@example.com');
    });

    it('allows updating same email', async () => {
      const service = new UserService();
      const storedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        toSafeJSON: () => ({ id: 'user-1', email: 'test@example.com', name: 'Updated Name', role: UserRole.USER, emailVerified: false }),
      };
      userRepositoryMock.findById.mockResolvedValue(storedUser);
      userRepositoryMock.update.mockResolvedValue({
        ...storedUser,
        name: 'Updated Name',
        toSafeJSON: () => ({ id: 'user-1', email: 'test@example.com', name: 'Updated Name', role: UserRole.USER, emailVerified: false }),
      });

      const result = await service.updateProfile('user-1', { name: 'Updated Name' });

      expect(userRepositoryMock.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('changePassword', () => {
    it('throws NotFoundError when user not found', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws UnauthorizedError for incorrect current password', async () => {
      const service = new UserService();
      const user = {
        id: 'user-1',
        password: 'hashedPassword',
      };
      userRepositoryMock.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.changePassword('user-1', { currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws ValidationError for invalid new password', async () => {
      const service = new UserService();
      const user = {
        id: 'user-1',
        password: 'hashedPassword',
      };
      userRepositoryMock.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.changePassword('user-1', { currentPassword: 'OldPass1!', newPassword: 'weak' })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('changes password successfully', async () => {
      const service = new UserService();
      const user = {
        id: 'user-1',
        password: 'hashedPassword',
      };
      userRepositoryMock.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('newHashedPassword');
      userRepositoryMock.update.mockResolvedValueOnce(undefined);

      await service.changePassword('user-1', { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass1!', 'hashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1!', 10);
      expect(userRepositoryMock.update).toHaveBeenCalledWith('user-1', { password: 'newHashedPassword' });
    });
  });

  describe('getUserById', () => {
    it('throws NotFoundError when user not found', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.getUserById('missing-user')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns safe user for valid id', async () => {
      const service = new UserService();
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        emailVerified: false,
        toSafeJSON: () => ({ id: 'user-1', email: 'test@example.com', name: 'Test User', role: UserRole.USER, emailVerified: false }),
      };
      userRepositoryMock.findById.mockResolvedValue(user);

      const result = await service.getUserById('user-1');

      expect(result).toEqual(user.toSafeJSON());
    });
  });

  describe('deleteUser', () => {
    it('throws NotFoundError when delete fails', async () => {
      const service = new UserService();
      passwordResetTokenRepositoryMock.deleteByUserId.mockResolvedValue(undefined);
      userRepositoryMock.delete.mockResolvedValue(false);

      await expect(service.deleteUser('missing-user')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('deletes user successfully', async () => {
      const service = new UserService();
      passwordResetTokenRepositoryMock.deleteByUserId.mockResolvedValue(undefined);
      userRepositoryMock.delete.mockResolvedValue(true);

      await service.deleteUser('user-1');

      expect(passwordResetTokenRepositoryMock.deleteByUserId).toHaveBeenCalledWith('user-1');
      expect(userRepositoryMock.delete).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateUserRole', () => {
    it('throws NotFoundError when user not found', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.updateUserRole('user-1', { role: UserRole.ADMIN })
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('updates user role successfully', async () => {
      const service = new UserService();
      const user = {
        id: 'user-1',
        role: UserRole.USER,
        emailVerified: false,
        toSafeJSON: () => ({ id: 'user-1', role: UserRole.ADMIN, emailVerified: false }),
      };
      userRepositoryMock.findById.mockResolvedValue(user);
      userRepositoryMock.update.mockResolvedValue({
        ...user,
        role: UserRole.ADMIN,
        toSafeJSON: () => ({ id: 'user-1', role: UserRole.ADMIN, emailVerified: false }),
      });

      const result = await service.updateUserRole('user-1', { role: UserRole.ADMIN });

      expect(userRepositoryMock.update).toHaveBeenCalledWith('user-1', { role: UserRole.ADMIN });
      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe('updateProfilePicture', () => {
    it('throws NotFoundError when user not found', async () => {
      const service = new UserService();
      userRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.updateProfilePicture('user-1', 'https://example.com/pic.jpg')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('updates profile picture successfully', async () => {
      const service = new UserService();
      const user = {
        id: 'user-1',
        profileUrl: null,
        emailVerified: false,
        toSafeJSON: () => ({ id: 'user-1', profileUrl: 'https://example.com/pic.jpg', emailVerified: false }),
      };
      userRepositoryMock.findById.mockResolvedValue(user);
      userRepositoryMock.update.mockResolvedValue({
        ...user,
        profileUrl: 'https://example.com/pic.jpg',
        toSafeJSON: () => ({ id: 'user-1', profileUrl: 'https://example.com/pic.jpg', emailVerified: false }),
      });

      const result = await service.updateProfilePicture('user-1', 'https://example.com/pic.jpg');

      expect(userRepositoryMock.update).toHaveBeenCalledWith('user-1', { profileUrl: 'https://example.com/pic.jpg' });
      expect(result.profileUrl).toBe('https://example.com/pic.jpg');
    });
  });

  describe('listUsers', () => {
    it('returns paginated users', async () => {
      const service = new UserService();
      const users = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          toSafeJSON: () => ({ id: 'user-1', email: 'test1@example.com', role: UserRole.USER, emailVerified: false }),
        },
        {
          id: 'user-2',
          email: 'test2@example.com',
          toSafeJSON: () => ({ id: 'user-2', email: 'test2@example.com', role: UserRole.USER, emailVerified: false }),
        },
      ];
      userRepositoryMock.findPaginated.mockResolvedValue({ data: users, total: 2 });

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('handles search parameter', async () => {
      const service = new UserService();
      userRepositoryMock.findPaginated.mockResolvedValue({ data: [], total: 0 });

      await service.listUsers({ page: 1, limit: 20, search: 'test' });

      expect(userRepositoryMock.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'test' });
    });

    it('handles role filter', async () => {
      const service = new UserService();
      userRepositoryMock.findPaginated.mockResolvedValue({ data: [], total: 0 });

      await service.listUsers({ page: 1, limit: 20, role: UserRole.ADMIN });

      expect(userRepositoryMock.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 20, role: UserRole.ADMIN });
    });
  });
});

