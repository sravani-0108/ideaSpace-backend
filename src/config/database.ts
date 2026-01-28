import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { EmailVerification } from '../entities/EmailVerification';
import { Idea } from '../entities/Idea';
import { Comment } from '../entities/Comment';
import { Like } from '../entities/Like';
import { Notification } from '../entities/Notification';
import { SavedIdea } from '../entities/SavedIdea';
import { Hackathon } from '../entities/Hackathon';
import { HackathonRegistration } from '../entities/HackathonRegistration';
import { Team } from '../entities/Team';
import { Meeting } from '../entities/Meeting';

console.log("=== Environment Variables ===");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "undefined");
console.log("DB_PORT:", process.env.DB_PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "***" : "undefined");
console.log("=============================");

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'idea_platform',
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create tables in dev
  logging: process.env.NODE_ENV === 'development',
  entities: [User, EmailVerification, Idea, Comment, Like, Notification, SavedIdea, Hackathon, HackathonRegistration, Team, Meeting],
  migrations: ['dist/migrations/**/*.js'],
  migrationsTableName: 'migrations',
  subscribers: [],
});
