import { UserRepository } from '../repository/UserRepository';
import { User, UserRole } from '../model/User';
import * as bcrypt from 'bcrypt';
import { ValidationError } from '../utils/errors';
import { isValidEmail, isValidPassword, validateName } from '../utils/validation';

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private readonly saltRounds = 10;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async signup(data: SignupData): Promise<User> {
    // Validate email
    if (!isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password
    const passwordValidation = isValidPassword(data.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.error!);
    }

    // Validate name
    const nameValidation = validateName(data.name);
    if (!nameValidation.valid) {
      throw new ValidationError(nameValidation.error!);
    }

    const existingUser = await this.userRepository.findByEmail(data.email.toLowerCase().trim());
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);
    const user = await this.userRepository.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role: UserRole.USER,
    });

    return user;
  }

  async login(data: LoginData): Promise<User | null> {
    if (!isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    const user = await this.userRepository.findByEmail(data.email.toLowerCase().trim());
    if (!user) {
      return null;
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }
}

