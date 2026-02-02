import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { errorMiddleware } from './middlewares/error.middleware';

// Load .env file from project root (works from both src/ and dist/)
// Try project root first (for dist/), then fallback to current directory (for src/)
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
if (!process.env.DB_USERNAME) {
  dotenv.config(); // Fallback for dev mode
}

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IdeaSpace API is running' });
});

// Serve static files for profile pictures with CORS headers
app.use('/api/uploads/profile-pictures', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, '../uploads/profile-pictures')));

// Serve static files for idea files with CORS headers
app.use('/api/uploads/idea-files', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, '../uploads/idea-files')));

// API routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

export default app;

