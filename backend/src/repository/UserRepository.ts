import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { User } from '../model/User';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    role?: User['role'];
  }): Promise<{ data: User[]; total: number }> {
    const { page, limit, search, role } = params;
    const qb = this.repository.createQueryBuilder('user');

    if (search) {
      qb.andWhere('(user.email ILIKE :search OR user.name ILIKE :search)', { search: `%${search}%` });
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findAll(): Promise<User[]> {
    return await this.repository.find();
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async save(user: User): Promise<User> {
    return await this.repository.save(user);
  }
}

