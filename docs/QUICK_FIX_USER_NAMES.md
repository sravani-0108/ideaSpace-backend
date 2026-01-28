# Quick Fix: firstName/lastName Migration Error

## Problem
```
column "firstName" of relation "users" contains null values
```

TypeORM's `synchronize` cannot add NOT NULL columns to existing rows.

---

## Solution 1: Run Migration Script (Recommended)

**Run this command:**
```bash
cd Ideaspace-backend
npm run db:migrate-user-names
```

This will:
- Add columns with DEFAULT values
- Update existing users
- Make columns NOT NULL

**Then start server:**
```bash
npm run dev
```

---

## Solution 2: Manual SQL Fix

Connect to your PostgreSQL database and run:

```sql
-- Step 1: Add columns as nullable first
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "firstName" VARCHAR NULL,
ADD COLUMN IF NOT EXISTS "lastName" VARCHAR NULL;

-- Step 2: Update existing users with default values
UPDATE "users" 
SET 
  "firstName" = COALESCE(
    INITCAP(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 1)),
    'User'
  ),
  "lastName" = COALESCE(
    INITCAP(NULLIF(SPLIT_PART(SPLIT_PART(email, '@', 1), '.', 2), '')),
    ''
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- Step 3: Make columns NOT NULL
ALTER TABLE "users" 
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;
```

---

## Solution 3: Temporary Fix (Make Columns Nullable)

If you want to start the server immediately, temporarily make columns nullable:

**Update `src/entities/User.ts`:**
```typescript
@Column({ nullable: true })
firstName?: string;

@Column({ nullable: true })
lastName?: string;
```

**Then:**
1. Start server (will work now)
2. Run migration script later
3. Update entity back to NOT NULL

---

## After Fix

Once migration is complete:
- ✅ Server will start without errors
- ✅ New registrations require firstName/lastName
- ✅ Existing users have values
- ✅ All API responses include names

---

## Verify Fix

Check if columns exist and have values:
```sql
SELECT id, email, "firstName", "lastName" FROM users LIMIT 5;
```

All rows should have firstName and lastName values (no NULLs).

