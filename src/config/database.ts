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


export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'idea_platform',
  synchronize: false, // Always use migrations instead of auto-sync
  logging: process.env.NODE_ENV === 'development',
  entities: [User, EmailVerification, Idea, Comment, Like, Notification, SavedIdea, Hackathon, HackathonRegistration, Team],
  migrations: ['dist/migrations/**/*.js'],
  migrationsTableName: 'migrations',
  subscribers: [],
});
