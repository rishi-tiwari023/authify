import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileUrl!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @BeforeInsert()
  private handleBeforeInsert(): void {
    this.normalizeFields();
  }

  @BeforeUpdate()
  private handleBeforeUpdate(): void {
    this.normalizeFields();
  }

  private normalizeFields(): void {
    if (this.name) {
      this.name = this.name.trim();
    }

    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }

    if (typeof this.profileUrl === 'string') {
      const normalizedProfileUrl = this.profileUrl.trim();
      this.profileUrl = normalizedProfileUrl.length > 0 ? normalizedProfileUrl : null;
    }
  }
}


