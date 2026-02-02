import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { DataSource } from 'typeorm';

// Load environment variables FIRST, before any other imports
// When running from dist/, we need to look for .env in the project root (one level up)
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Fallback: also try loading from current directory (for dev mode)
if (!process.env.DB_USER) {
  dotenv.config();
}

import app from './app';
import { AppDataSource } from './config/database';

const PORT = process.env.PORT || 5000;

// Initialize database connection with error handling for enum issues
async function initializeDatabase() {
  try {
    // First, ensure the enum has all required values before synchronize
    const tempConnection = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'idea_platform',
    });

    await tempConnection.initialize();
    
    // Ensure hackathon_status_enum has DRAFT value
    try {
      await tempConnection.query(`
        DO $$ 
        BEGIN
          -- Check if enum exists
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hackathon_status_enum') THEN
            -- Add DRAFT if it doesn't exist (PostgreSQL only allows adding at the end)
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumlabel = 'DRAFT' 
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'hackathon_status_enum')
            ) THEN
              ALTER TYPE "hackathon_status_enum" ADD VALUE 'DRAFT';
            END IF;
          ELSE
            -- Create enum with all values if it doesn't exist
            CREATE TYPE "hackathon_status_enum" AS ENUM('DRAFT', 'PENDING', 'ACTIVE', 'COMPLETED');
          END IF;
        END $$;
      `);
    } catch (enumError: any) {
      // Ignore if enum value already exists or other minor issues
    }
    
    await tempConnection.destroy();
  } catch (tempError: any) {
    // If temp connection fails, continue anyway - enum might already be correct
  }

  // Now initialize the main connection
  try {
    await AppDataSource.initialize();
  } catch (error: any) {
    // If error is about enum already existing (code 42710), retry without synchronize
    if (error.code === '42710' || (error.message && error.message.includes('already exists'))) {
      // Destroy the failed connection if it was partially initialized
      if (AppDataSource.isInitialized) {
        try {
          await AppDataSource.destroy();
        } catch (destroyError) {
          // Ignore destroy errors
        }
      }
      
      // Initialize without synchronize to avoid enum creation conflicts
      const noSyncDS = new DataSource({
        ...AppDataSource.options,
        synchronize: false,
      });
      await noSyncDS.initialize();
    } else if (error.code === '22P02' && error.message && error.message.includes('invalid input value for enum')) {
      throw error;
    } else {
      throw error;
    }
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

initializeDatabase().catch((error) => {
  console.error('Error connecting to database:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await AppDataSource.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await AppDataSource.destroy();
  process.exit(0);
});

