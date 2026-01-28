import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UserRole enum
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('USER', 'ADMIN')
    `);

    // Create IdeaStatus enum
    await queryRunner.query(`
      CREATE TYPE "idea_status_enum" AS ENUM('REVIEW', 'APPROVED', 'REJECTED')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'USER',
        "isVerified" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create email_verifications table
    await queryRunner.query(`
      CREATE TABLE "email_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "otp" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_email_verifications_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create ideas table
    await queryRunner.query(`
      CREATE TABLE "ideas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "status" "idea_status_enum" NOT NULL DEFAULT 'REVIEW',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ideas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ideas_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create comments table
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "content" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_ideaId" FOREIGN KEY ("ideaId") 
          REFERENCES "ideas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_comments_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create likes table
    await queryRunner.query(`
      CREATE TABLE "likes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_likes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_likes_ideaId" FOREIGN KEY ("ideaId") 
          REFERENCES "ideas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_likes_userId" FOREIGN KEY ("userId") 
          REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "UQ_likes_ideaId_userId" UNIQUE ("ideaId", "userId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_ideas_status" ON "ideas" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ideas_userId" ON "ideas" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_comments_ideaId" ON "comments" ("ideaId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_likes_ideaId" ON "likes" ("ideaId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "likes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ideas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    
    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "idea_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}

