import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixHackathonStatusEnum1738000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add DRAFT to hackathon_status_enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        -- Check if enum exists, if not create it
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hackathon_status_enum') THEN
          CREATE TYPE "hackathon_status_enum" AS ENUM('DRAFT', 'PENDING', 'ACTIVE', 'COMPLETED');
        ELSE
          -- Enum exists, add DRAFT if it doesn't exist (PostgreSQL only allows adding at the end)
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'DRAFT' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'hackathon_status_enum')
          ) THEN
            ALTER TYPE "hackathon_status_enum" ADD VALUE 'DRAFT';
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: We don't drop the enum in down migration as it might be in use
    // PostgreSQL doesn't support removing enum values, only entire enum types
    // If needed, manually drop: DROP TYPE IF EXISTS "hackathon_status_enum";
  }
}

