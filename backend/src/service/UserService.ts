import { UserRepository } from '../repository/UserRepository';
import { SafeUser, User } from '../model/User';
import * as bcrypt from 'bcrypt';
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors';
import { isValidEmail, validateName } from '../utils/validation';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  profileUrl?: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  private userRepository: UserRepository;
  private readonly saltRounds = 10;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async updateProfile(userId: string, data: UpdateProfileData): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate email if provided
    if (data.email && data.email !== user.email) {
      if (!isValidEmail(data.email)) {
        throw new ValidationError('Invalid email format');
      }
      
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== userId) {
        throw new ValidationError('Email already in use');
      }
    }

    // Validate name if provided
    if (data.name) {
      const nameValidation = validateName(data.name);
      if (!nameValidation.valid) {
        throw new ValidationError(nameValidation.error!);
      }
    }

    const updateData: Partial<User> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.profileUrl !== undefined) updateData.profileUrl = data.profileUrl;

    const updatedUser = await this.userRepository.update(userId, updateData);
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    return updatedUser.toSafeJSON();
  }

  async changePassword(userId: string, data: ChangePasswordData): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, this.saltRounds);
    await this.userRepository.update(userId, { password: hashedPassword });
  }

  async getUserById(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toSafeJSON();
  }

  async deleteUser(userId: string): Promise<void> {
    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new NotFoundError('User not found');
    }
  }
}

