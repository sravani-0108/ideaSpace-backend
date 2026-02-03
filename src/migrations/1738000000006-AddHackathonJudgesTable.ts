import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJudgeIdsToHackathons1738000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add judgeIds column to hackathons table
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      ADD COLUMN IF NOT EXISTS "judgeIds" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove judgeIds column
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      DROP COLUMN IF EXISTS "judgeIds";
    `);
  }
}

