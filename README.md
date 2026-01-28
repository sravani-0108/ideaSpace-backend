# IdeaSpace Backend

Internal Idea-Sharing Platform Backend API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example` and configure:
   - Database credentials
   - JWT secret
   - Email service credentials
   - Allowed email domains

3. Make sure PostgreSQL is running and create the database:
```sql
CREATE DATABASE idea_platform;
```

4. Run migrations (TypeORM will auto-create tables on first run):
```bash
npm run dev
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Documentation

All documentation is available in the `docs/` folder:

- **[Setup Guide](docs/SETUP.md)** - Detailed setup instructions
- **[Environment Setup](docs/ENV_SETUP.md)** - Environment variables configuration
- **[Database Setup](docs/DATABASE_SETUP.md)** - Database configuration and table creation
- **[Architecture Explanation](docs/ARCHITECTURE_EXPLANATION.md)** - Controller vs Service explanation
- **[Admin Flow](docs/ADMIN_FLOW.md)** - Admin authentication and authorization flow
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Complete feature list

## API Endpoints

See `DESIGN_DOCUMENT.md` in the root directory for complete API documentation.

