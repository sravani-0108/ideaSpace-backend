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

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connected successfully');
    console.log('✓ Database tables synchronized');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
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

