import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { AppDataSource } from '../config/database';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
if (!process.env.DB_USER) {
  dotenv.config();
}

async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('✓ Database connected successfully');

    console.log('\nEnabling uuid-ossp extension...');
    try {
      await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✓ UUID extension enabled');
    } catch (error: any) {
      if (error.code === '42883') {
        console.log('⚠ UUID extension might already exist or need manual installation');
      } else {
        throw error;
      }
    }

    console.log('\nSynchronizing database schema...');
    // This will create tables based on entities
    await AppDataSource.synchronize();
    console.log('✓ Database tables created successfully');

    console.log('\nDatabase initialization completed!');
    console.log('\nCreated tables:');
    console.log('  - users');
    console.log('  - email_verifications');
    console.log('  - ideas');
    console.log('  - comments');
    console.log('  - likes');

    await AppDataSource.destroy();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();

