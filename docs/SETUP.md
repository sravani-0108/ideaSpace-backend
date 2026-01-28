# Backend Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd Ideaspace-backend
   npm install
   ```

2. **Setup Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the following variables:
     - Database credentials (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME)
     - JWT_SECRET (use a strong random string)
     - Email service credentials (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD)
     - ALLOWED_EMAIL_DOMAINS (comma-separated, e.g., `@company.com,@office.com`)

3. **Create Database**
   ```sql
   CREATE DATABASE idea_platform;
   ```

4. **Run the Server**
   ```bash
   npm run dev
   ```

   The server will:
   - Connect to PostgreSQL
   - Auto-create all tables (in development mode)
   - Start on port 5000 (or PORT from .env)

## Creating First Admin User

Since admin registration is not available through the API, you need to create the first admin user manually:

### Option 1: Using PostgreSQL directly

```sql
-- First, register a user normally through the API
-- Then update their role to ADMIN:

UPDATE users SET role = 'ADMIN' WHERE email = 'admin@company.com';
```

### Option 2: Using a database migration script

Create a script to insert admin user directly (make sure to hash the password first using bcrypt).

## API Endpoints

All endpoints are prefixed with `/api`

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/resend-otp` - Resend verification OTP

### Ideas (Requires Authentication)
- `POST /api/ideas` - Create new idea (status: REVIEW)
- `GET /api/ideas` - Get all approved ideas (paginated)
- `GET /api/ideas/:id` - Get idea details with comments and likes

### Comments (Requires Authentication)
- `POST /api/ideas/:ideaId/comments` - Add comment to approved idea

### Likes (Requires Authentication)
- `POST /api/ideas/:ideaId/like` - Like an approved idea
- `DELETE /api/ideas/:ideaId/like` - Unlike an idea

### Admin (Requires Authentication + Admin Role)
- `GET /api/admin/ideas/review` - Get all ideas in REVIEW status
- `PATCH /api/admin/ideas/:id/approve` - Approve an idea
- `PATCH /api/admin/ideas/:id/reject` - Reject an idea

## Testing the API

### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "password": "SecurePass123"
  }'
```

### 2. Verify Email
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "otp": "123456"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "password": "SecurePass123"
  }'
```

### 4. Create Idea (Use JWT token from login)
```bash
curl -X POST http://localhost:5000/api/ideas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "New Feature Idea",
    "description": "This is a detailed description of my idea"
  }'
```

## Email Configuration

For Gmail:
1. Enable 2-Step Verification
2. Generate an App Password
3. Use the App Password in EMAIL_PASSWORD

For other SMTP providers, update EMAIL_HOST and EMAIL_PORT accordingly.

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Email Not Sending
- Verify SMTP credentials
- Check EMAIL_HOST and EMAIL_PORT
- For Gmail, ensure App Password is used (not regular password)

### JWT Errors
- Ensure JWT_SECRET is set in `.env`
- Check token expiration settings

## Production Considerations

1. Set `NODE_ENV=production` in `.env`
2. Disable `synchronize: true` in database config (use migrations instead)
3. Use strong JWT_SECRET
4. Enable HTTPS
5. Configure proper CORS origins
6. Set up proper logging
7. Use environment-specific database credentials

