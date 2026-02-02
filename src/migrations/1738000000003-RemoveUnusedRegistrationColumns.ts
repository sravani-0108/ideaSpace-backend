import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUnusedRegistrationColumns1738000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, migrate any existing data from registrationEndDate to registrationDeadline for Hands-On hackathons
    // This ensures we don't lose any data
    await queryRunner.query(`
      UPDATE "hackathons"
      SET "registrationDeadline" = "registrationEndDate"
      WHERE "registrationEndDate" IS NOT NULL 
        AND "registrationDeadline" IS NULL
        AND "hackathonType" = 'HANDS_ON'
    `);

    // Remove unused columns
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      DROP COLUMN IF EXISTS "registrationStartDate",
      DROP COLUMN IF EXISTS "registrationEndDate"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the columns (nullable)
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      ADD COLUMN IF NOT EXISTS "registrationStartDate" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "registrationEndDate" TIMESTAMP
    `);

    // Migrate data back from registrationDeadline to registrationEndDate for Hands-On hackathons
    await queryRunner.query(`
      UPDATE "hackathons"
      SET "registrationEndDate" = "registrationDeadline"
      WHERE "registrationDeadline" IS NOT NULL 
        AND "hackathonType" = 'HANDS_ON'
    `);
  }
}

