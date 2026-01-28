import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from '../config/database';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
if (!process.env.DB_USER) {
  dotenv.config();
}

/**
 * Migration script to add firstName and lastName columns to users table
 * Handles existing users by setting default values
 */
async function migrateAddUserNames() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('✓ Database connected successfully');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Check if columns already exist
      const columnsExist = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('firstName', 'lastName')
      `);

      if (columnsExist.length === 2) {
        console.log('✓ Columns already exist, skipping migration');
        return;
      }

      // Step 1: Add columns with default values (allows existing rows)
      console.log('\nStep 1: Adding firstName and lastName columns with defaults...');
      try {
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN IF NOT EXISTS "firstName" VARCHAR DEFAULT '' NOT NULL,
          ADD COLUMN IF NOT EXISTS "lastName" VARCHAR DEFAULT '' NOT NULL
        `);
        console.log('✓ Columns added with default values');
      } catch (error: any) {
        // If columns exist but are nullable, update them
        if (error.message.includes('already exists')) {
          console.log('⚠ Columns exist, updating to NOT NULL...');
          await queryRunner.query(`
            ALTER TABLE "users" 
            ALTER COLUMN "firstName" SET DEFAULT '',
            ALTER COLUMN "lastName" SET DEFAULT '';
          `);
          await queryRunner.query(`
            UPDATE "users" 
            SET "firstName" = '' WHERE "firstName" IS NULL;
            UPDATE "users" 
            SET "lastName" = '' WHERE "lastName" IS NULL;
          `);
          await queryRunner.query(`
            ALTER TABLE "users" 
            ALTER COLUMN "firstName" SET NOT NULL,
            ALTER COLUMN "lastName" SET NOT NULL;
          `);
          console.log('✓ Columns updated to NOT NULL');
        } else {
          throw error;
        }
      }

      // Step 2: Update existing users (extract name from email if possible)
      console.log('\nStep 2: Updating existing users with names from email...');
      const updateResult = await queryRunner.query(`
        UPDATE "users" 
        SET 
          "firstName" = CASE 
            WHEN "firstName" = '' 
            THEN COALESCE(
              INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1)),
              'User'
            )
            ELSE "firstName"
          END,
          "lastName" = CASE 
            WHEN "lastName" = '' 
            THEN COALESCE(
              INITCAP(NULLIF(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2), '')),
              ''
            )
            ELSE "lastName"
          END
        WHERE "firstName" = '' OR "lastName" = ''
      `);
      console.log(`✓ Updated existing users`);

      console.log('\n✅ Migration completed successfully!');
    } catch (error: any) {
      console.error('❌ Error during migration:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }

    await AppDataSource.destroy();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateAddUserNames();

