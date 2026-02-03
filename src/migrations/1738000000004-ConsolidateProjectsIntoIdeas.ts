import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidateProjectsIntoIdeas1738000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add project-related fields to ideas table
    await queryRunner.query(`
      ALTER TABLE "ideas"
      ADD COLUMN IF NOT EXISTS "githubUrl" character varying,
      ADD COLUMN IF NOT EXISTS "demoVideoUrl" character varying,
      ADD COLUMN IF NOT EXISTS "projectDescription" text,
      ADD COLUMN IF NOT EXISTS "implementationDetails" text,
      ADD COLUMN IF NOT EXISTS "pitchVideoUrl" character varying,
      ADD COLUMN IF NOT EXISTS "presentationUrl" character varying,
      ADD COLUMN IF NOT EXISTS "judgeFeedback" text,
      ADD COLUMN IF NOT EXISTS "reviewedBy" uuid,
      ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;
    `);

    // Add foreign key constraint for reviewedBy (only if it doesn't exist)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'FK_ideas_reviewedBy'
        ) THEN
          ALTER TABLE "ideas"
          ADD CONSTRAINT "FK_ideas_reviewedBy" 
          FOREIGN KEY ("reviewedBy") 
          REFERENCES "users"("id") 
          ON DELETE SET NULL 
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // Migrate data from projects table to ideas table (if projects table exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
          UPDATE "ideas" i
          SET 
            "githubUrl" = p."githubUrl",
            "demoVideoUrl" = p."demoVideoUrl",
            "documentationUrl" = COALESCE(i."documentationUrl", p."documentationUrl"),
            "zipFilePath" = COALESCE(i."zipFilePath", p."zipFilePath"),
            "projectDescription" = p."projectDescription",
            "implementationDetails" = p."implementationDetails",
            "pitchVideoUrl" = p."pitchVideoUrl",
            "presentationUrl" = p."presentationUrl",
            "judgeFeedback" = p."judgeFeedback",
            "reviewedBy" = p."reviewedBy",
            "reviewedAt" = p."reviewedAt"
          FROM "projects" p
          WHERE i."id" = p."ideaId";
        END IF;
      END $$;
    `);

    // Drop projects table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "projects" CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate projects table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
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
        "reviewedAt" TIMESTAMP,
        "submittedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_projects_ideaId" FOREIGN KEY ("ideaId") 
          REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_projects_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_projects_reviewedBy" FOREIGN KEY ("reviewedBy") 
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // Migrate data back from ideas to projects (if needed)
    // Note: This is a simplified migration - you may need to adjust based on your data

    // Remove project-related columns from ideas table
    await queryRunner.query(`
      ALTER TABLE "ideas"
      DROP CONSTRAINT IF EXISTS "FK_ideas_reviewedBy",
      DROP COLUMN IF EXISTS "githubUrl",
      DROP COLUMN IF EXISTS "demoVideoUrl",
      DROP COLUMN IF EXISTS "projectDescription",
      DROP COLUMN IF EXISTS "implementationDetails",
      DROP COLUMN IF EXISTS "pitchVideoUrl",
      DROP COLUMN IF EXISTS "presentationUrl",
      DROP COLUMN IF EXISTS "judgeFeedback",
      DROP COLUMN IF EXISTS "reviewedBy",
      DROP COLUMN IF EXISTS "reviewedAt";
    `);
  }
}

