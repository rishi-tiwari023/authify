import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum EmailStatus {
    SENT = 'SENT',
    FAILED = 'FAILED',
}

@Entity({ name: 'email_logs' })
export class EmailLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 150 })
    recipient!: string;

    @Column({ type: 'varchar', length: 255 })
    subject!: string;

    @Column({ type: 'enum', enum: EmailStatus })
    status!: EmailStatus;

    @Column({ type: 'text', nullable: true })
    errorMessage!: string | null;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt!: Date;
}
