import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStatusDeadlineToIdeas1738000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add statusDeadline column to ideas table
    await queryRunner.addColumn(
      'ideas',
      new TableColumn({
        name: 'statusDeadline',
        type: 'timestamp',
        isNullable: true,
      })
    );

    // Update idea_status_enum to include new Hands-On hackathon statuses
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Add UNDER_REVIEW if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'UNDER_REVIEW'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'idea_status_enum')
        ) THEN
          ALTER TYPE "idea_status_enum" ADD VALUE 'UNDER_REVIEW';
        END IF;

        -- Add PITCHING if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'PITCHING'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'idea_status_enum')
        ) THEN
          ALTER TYPE "idea_status_enum" ADD VALUE 'PITCHING';
        END IF;

        -- Add ENHANCEMENTS if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'ENHANCEMENTS'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'idea_status_enum')
        ) THEN
          ALTER TYPE "idea_status_enum" ADD VALUE 'ENHANCEMENTS';
        END IF;

        -- Add IMPLEMENTATION if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'IMPLEMENTATION'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'idea_status_enum')
        ) THEN
          ALTER TYPE "idea_status_enum" ADD VALUE 'IMPLEMENTATION';
        END IF;

        -- Add COMPLETED if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'COMPLETED'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'idea_status_enum')
        ) THEN
          ALTER TYPE "idea_status_enum" ADD VALUE 'COMPLETED';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove statusDeadline column
    await queryRunner.dropColumn('ideas', 'statusDeadline');

    // Note: PostgreSQL doesn't support removing enum values directly
    // The enum values will remain in the database but won't be used
  }
}

