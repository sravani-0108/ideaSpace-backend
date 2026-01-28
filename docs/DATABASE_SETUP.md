# Database Setup Guide

This guide explains how to create database tables from TypeORM entities.

## Option 1: Automatic Synchronization (Recommended for Development)

The easiest way to create tables is to enable `synchronize` mode. This automatically creates/updates tables based on your entities.

### Steps:

1. **Make sure your database exists:**
   ```sql
   CREATE DATABASE testdb;
   ```

2. **Start the server** - Tables will be created automatically:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

   When the server starts, TypeORM will automatically create all tables based on your entities.

### Note:
- `synchronize: true` is already enabled in development mode
- Tables are created automatically when the server connects
- This is perfect for development but **NOT recommended for production**

---

## Option 2: Using Database Initialization Script

A script is provided to initialize the database schema.

### Steps:

1. **Run the initialization script:**
   ```bash
   npm run db:init
   ```

   This will:
   - Connect to the database
   - Create all tables based on entities
   - Show confirmation of created tables

---

## Option 3: Using Migrations (Recommended for Production)

Migrations provide version control for your database schema.

### Generate a Migration:

```bash
npm run migration:generate -- src/migrations/InitialSchema
```

### Run Migrations:

```bash
npm run migration:run
```

### Revert Last Migration:

```bash
npm run migration:revert
```

---

## Option 4: Manual SQL Script

If you prefer to create tables manually, here's the SQL:

```sql
-- Create enums
CREATE TYPE "user_role_enum" AS ENUM('USER', 'ADMIN');
CREATE TYPE "idea_status_enum" AS ENUM('REVIEW', 'APPROVED', 'REJECTED');

-- Create users table
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
);

-- Create email_verifications table
CREATE TABLE "email_verifications" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "otp" character varying NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_email_verifications" PRIMARY KEY ("id"),
  CONSTRAINT "FK_email_verifications_userId" FOREIGN KEY ("userId") 
    REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create ideas table
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
    REFERENCES "users"("id") ON DELETE NO ACTION
);

-- Create comments table
CREATE TABLE "comments" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "ideaId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "content" text NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_comments" PRIMARY KEY ("id"),
  CONSTRAINT "FK_comments_ideaId" FOREIGN KEY ("ideaId") 
    REFERENCES "ideas"("id") ON DELETE NO ACTION,
  CONSTRAINT "FK_comments_userId" FOREIGN KEY ("userId") 
    REFERENCES "users"("id") ON DELETE NO ACTION
);

-- Create likes table
CREATE TABLE "likes" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "ideaId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_likes" PRIMARY KEY ("id"),
  CONSTRAINT "FK_likes_ideaId" FOREIGN KEY ("ideaId") 
    REFERENCES "ideas"("id") ON DELETE NO ACTION,
  CONSTRAINT "FK_likes_userId" FOREIGN KEY ("userId") 
    REFERENCES "users"("id") ON DELETE NO ACTION,
  CONSTRAINT "UQ_likes_ideaId_userId" UNIQUE ("ideaId", "userId")
);

-- Create indexes
CREATE INDEX "IDX_ideas_status" ON "ideas" ("status");
CREATE INDEX "IDX_ideas_userId" ON "ideas" ("userId");
CREATE INDEX "IDX_comments_ideaId" ON "comments" ("ideaId");
CREATE INDEX "IDX_likes_ideaId" ON "likes" ("ideaId");
```

---

## Verify Tables Created

After running any method, verify tables were created:

```sql
-- Connect to your database
\c testdb

-- List all tables
\dt

-- Or using SQL
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see:
- users
- email_verifications
- ideas
- comments
- likes

---

## Troubleshooting

### Error: "relation already exists"
- Tables already exist. Drop them first or use migrations.

### Error: "database does not exist"
- Create the database first: `CREATE DATABASE testdb;`

### Error: "permission denied"
- Check your database user has CREATE TABLE permissions.

### UUID Extension Missing
- Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

---

## Quick Start (Recommended)

For development, simply:

1. Ensure database exists
2. Set `NODE_ENV=development` in `.env`
3. Run: `npm run dev`
4. Tables will be created automatically!

