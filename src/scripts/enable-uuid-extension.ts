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

async function enableUUIDExtension() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('✓ Database connected successfully');

    console.log('\nEnabling uuid-ossp extension...');
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ UUID extension enabled successfully');

    console.log('\nNow you can create tables. Run: npm run db:init');
    console.log('Or start the server: npm run dev');

    await AppDataSource.destroy();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error enabling UUID extension:', error);
    process.exit(1);
  }
}

enableUUIDExtension();

