import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMeetingsTable1738000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Drop foreign key constraint for hackathonId if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_meetings_hackathonId'
        ) THEN
          ALTER TABLE "meetings" DROP CONSTRAINT "FK_meetings_hackathonId";
        END IF;

        -- Drop foreign key constraint for teamId if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_meetings_teamId'
        ) THEN
          ALTER TABLE "meetings" DROP CONSTRAINT "FK_meetings_teamId";
        END IF;

        -- Drop foreign key constraint for createdBy if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_meetings_createdBy'
        ) THEN
          ALTER TABLE "meetings" DROP CONSTRAINT "FK_meetings_createdBy";
        END IF;
      END $$;
    `);

    // Drop indexes if they exist
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_meetings_hackathonId";
      DROP INDEX IF EXISTS "IDX_meetings_teamId";
      DROP INDEX IF EXISTS "IDX_meetings_scheduledDate";
    `);

    // Drop the meetings table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "meetings" CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate meetings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "meetings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "scheduledDate" TIMESTAMP NOT NULL,
        "meetingLink" character varying,
        "hackathonId" uuid NOT NULL,
        "teamId" uuid,
        "createdBy" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meetings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meetings_hackathonId" FOREIGN KEY ("hackathonId") 
          REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_meetings_teamId" FOREIGN KEY ("teamId") 
          REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_meetings_createdBy" FOREIGN KEY ("createdBy") 
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_meetings_hackathonId" ON "meetings"("hackathonId");
      CREATE INDEX "IDX_meetings_teamId" ON "meetings"("teamId");
      CREATE INDEX "IDX_meetings_scheduledDate" ON "meetings"("scheduledDate");
    `);
  }
}

