import { UserRepository } from '../repository/UserRepository';
import { User, UserRole } from '../model/User';

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

  constructor() {
    this.userRepository = new UserRepository();
  }

  async signup(data: SignupData): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // TODO: Hash password before saving
    const user = await this.userRepository.create({
      name: data.name,
      email: data.email,
      password: data.password, // Temporary - needs hashing
      role: UserRole.USER,
    });

    return user;
  }

  async login(data: LoginData): Promise<User | null> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      return null;
    }

    // TODO: Verify password hash
    if (user.password !== data.password) {
      return null;
    }

    return user;
  }
}

