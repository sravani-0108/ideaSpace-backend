import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHandsOnHackathon1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add JUDGE to UserRole enum
    await queryRunner.query(`
      ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'JUDGE'
    `);

    // Create HackathonType enum
    await queryRunner.query(`
      CREATE TYPE "hackathon_type_enum" AS ENUM('LEARNING', 'HANDS_ON')
    `);

    // Create ProjectStatus enum
    await queryRunner.query(`
      CREATE TYPE "project_status_enum" AS ENUM(
        'NOT_SUBMITTED',
        'SUBMITTED',
        'LATE',
        'UNDER_REVIEW',
        'COMPLETED',
        'NEEDS_CHANGES',
        'DISQUALIFIED'
      )
    `);

    // Add Hands-On hackathon fields to hackathons table
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      ADD COLUMN IF NOT EXISTS "hackathonType" "hackathon_type_enum" NOT NULL DEFAULT 'LEARNING',
      ADD COLUMN IF NOT EXISTS "registrationStartDate" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "registrationEndDate" TIMESTAMP
    `);

    // Add hackathon linking and project fields to ideas table
    await queryRunner.query(`
      ALTER TABLE "ideas"
      ADD COLUMN IF NOT EXISTS "hackathonId" uuid,
      ADD COLUMN IF NOT EXISTS "rejectionReason" text,
      ADD COLUMN IF NOT EXISTS "projectDeadline" TIMESTAMP
    `);

    // Add foreign key for hackathonId
    await queryRunner.query(`
      ALTER TABLE "ideas"
      ADD CONSTRAINT "FK_ideas_hackathonId"
      FOREIGN KEY ("hackathonId")
      REFERENCES "hackathons"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // Create projects table
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "status" "project_status_enum" NOT NULL DEFAULT 'NOT_SUBMITTED',
        "githubUrl" character varying,
        "demoVideoUrl" character varying,
        "documentationUrl" character varying,
        "zipFilePath" character varying,
        "projectDescription" text,
        "implementationDetails" text,
        "pitchVideoUrl" character varying,
        "presentationUrl" character varying,
        "judgeFeedback" text,
        "reviewedBy" uuid,
        "submittedAt" TIMESTAMP,
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_projects_ideaId" FOREIGN KEY ("ideaId")
          REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_projects_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_projects_reviewedBy" FOREIGN KEY ("reviewedBy")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    // Create indexes for projects table
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_ideaId" ON "projects"("ideaId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_userId" ON "projects"("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_projects_status" ON "projects"("status")
    `);

    // Create index for ideas hackathonId
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ideas_hackathonId" ON "ideas"("hackathonId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop projects table
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ideas_hackathonId"`);

    // Remove foreign key and columns from ideas table
    await queryRunner.query(`
      ALTER TABLE "ideas"
      DROP CONSTRAINT IF EXISTS "FK_ideas_hackathonId",
      DROP COLUMN IF EXISTS "hackathonId",
      DROP COLUMN IF EXISTS "rejectionReason",
      DROP COLUMN IF EXISTS "projectDeadline"
    `);

    // Remove columns from hackathons table
    await queryRunner.query(`
      ALTER TABLE "hackathons"
      DROP COLUMN IF EXISTS "hackathonType",
      DROP COLUMN IF EXISTS "registrationStartDate",
      DROP COLUMN IF EXISTS "registrationEndDate"
    `);

    // Drop enums (Note: Cannot drop enum values, only entire enum)
    await queryRunner.query(`DROP TYPE IF EXISTS "project_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hackathon_type_enum"`);
    
    // Note: Cannot remove JUDGE from user_role_enum in down migration
    // as PostgreSQL doesn't support removing enum values
  }
}

