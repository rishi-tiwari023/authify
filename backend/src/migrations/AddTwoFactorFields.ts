import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add Two-Factor Authentication Fields
 * 
 * This migration adds the necessary columns to the users table to support
 * TOTP-based two-factor authentication:
 * - twoFactorSecret: Encrypted storage for the user's TOTP secret
 * - twoFactorEnabled: Boolean flag indicating if 2FA is active
 * - twoFactorBackupCodes: JSON array of hashed backup codes for account recovery
 * 
 * @class AddTwoFactorFields
 * @implements {MigrationInterface}
 */
export class AddTwoFactorFields1735401000000 implements MigrationInterface {
    /**
     * Run the migration - adds 2FA columns to users table
     * @param queryRunner - TypeORM query runner
     */
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add twoFactorSecret column (nullable, for encrypted TOTP secret)
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'twoFactorSecret',
                type: 'varchar',
                length: '255',
                isNullable: true,
                comment: 'Encrypted TOTP secret for two-factor authentication',
            })
        );

        // Add twoFactorEnabled column (boolean, default false)
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'twoFactorEnabled',
                type: 'boolean',
                default: false,
                isNullable: false,
                comment: 'Flag indicating if 2FA is enabled for this user',
            })
        );

        // Add twoFactorBackupCodes column (JSONB array, nullable)
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'twoFactorBackupCodes',
                type: 'jsonb',
                isNullable: true,
                comment: 'Array of hashed backup codes for account recovery',
            })
        );

        console.log('✓ Successfully added 2FA fields to users table');
    }

    /**
     * Rollback the migration - removes 2FA columns from users table
     * @param queryRunner - TypeORM query runner
     */
    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove columns in reverse order
        await queryRunner.dropColumn('users', 'twoFactorBackupCodes');
        await queryRunner.dropColumn('users', 'twoFactorEnabled');
        await queryRunner.dropColumn('users', 'twoFactorSecret');

        console.log('✓ Successfully removed 2FA fields from users table');
    }
}
