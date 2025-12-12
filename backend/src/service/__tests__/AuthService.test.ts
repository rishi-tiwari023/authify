import { AuthService } from '../AuthService';
import { ValidationError } from '../../utils/errors';
import { UserRole } from '../../model/User';

const userRepositoryMock = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const passwordResetTokenRepositoryMock = {};

const emailServiceMock = {
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../repository/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => userRepositoryMock),
}));

jest.mock('../../repository/PasswordResetTokenRepository', () => ({
  PasswordResetTokenRepository: jest.fn().mockImplementation(() => passwordResetTokenRepositoryMock),
}));

jest.mock('../EmailService', () => ({
  EmailService: jest.fn().mockImplementation(() => emailServiceMock),
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

    it('creates user and sends welcome email for valid input', async () => {
      const service = new AuthService();
      userRepositoryMock.findByEmail.mockResolvedValueOnce(null);
      const createdUser = {
        id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.USER,
        toSafeJSON: () => ({ id: 'u1', name: 'Test User', email: 'test@example.com', role: UserRole.USER }),
      };
      userRepositoryMock.create.mockResolvedValueOnce(createdUser);

      const result = await service.signup({ name: 'Test User', email: 'test@example.com', password: 'Password1!' });

      expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(emailServiceMock.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', 'Test User');
      expect(result).toEqual(createdUser);
    });
  });
});

