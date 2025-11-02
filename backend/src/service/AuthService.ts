import { UserRepository } from '../repository/UserRepository';
import { User, UserRole } from '../model/User';
import * as bcrypt from 'bcrypt';

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
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: UserRole.USER,
    });

    return user;
  }

  async login(data: LoginData): Promise<User | null> {
    const user = await this.userRepository.findByEmail(data.email);
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

