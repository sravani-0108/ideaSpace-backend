# Environment Variables Setup

## Quick Setup

1. **Create `.env` file** in the `Ideaspace-backend` directory

2. **Copy this template** and update with your values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=idea_platform

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@company.com

# Server Configuration
PORT=5000
NODE_ENV=development

# Allowed Email Domains (comma-separated)
ALLOWED_EMAIL_DOMAINS=@company.com,@office.com
```

## PostgreSQL Setup

### Windows:
1. **Check if PostgreSQL is installed:**
   ```powershell
   psql --version
   ```

2. **Start PostgreSQL service:**
   ```powershell
   # Option 1: Using Services
   # Press Win+R, type "services.msc", find "postgresql" and start it
   
   # Option 2: Using Command Line (as Administrator)
   net start postgresql-x64-14  # Replace with your version
   ```

3. **Create the database:**
   ```powershell
   psql -U postgres
   ```
   Then in psql:
   ```sql
   CREATE DATABASE idea_platform;
   \q
   ```

### Alternative: Using pgAdmin
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `idea_platform`
5. Click "Save"

## Email Setup (Gmail Example)

1. **Enable 2-Step Verification** in your Google Account
2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "IdeaSpace" as name
   - Copy the generated 16-character password
   - Use this password in `EMAIL_PASSWORD`

## Testing Database Connection

After setting up `.env`, test the connection:

```powershell
cd Ideaspace-backend
npm run dev
```

You should see:
```
Database connected successfully
Server is running on port 5000
```

If you see connection errors:
1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database `idea_platform` exists
4. Verify firewall isn't blocking port 5432

