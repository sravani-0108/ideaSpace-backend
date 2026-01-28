# Migration Guide: Adding firstName and lastName to Users Table

## Problem

When adding NOT NULL columns to an existing table with data, PostgreSQL throws an error:
```
column "firstName" of relation "users" contains null values
```

## Solution

Run the migration script **before** starting the server. The script will:
1. Add columns with DEFAULT values (allows existing rows)
2. Update existing users with values extracted from email
3. Make columns NOT NULL

---

## Steps to Fix

### Option 1: Run Migration Script (Recommended)

**Step 1:** Run the migration script
```bash
cd Ideaspace-backend
npm run db:migrate-user-names
```

**Step 2:** Start your server
```bash
npm run dev
```

The migration script will:
- ✅ Add `firstName` and `lastName` columns with default values
- ✅ Update existing users (extracts names from email if possible)
- ✅ Handle the NOT NULL constraint properly

---

### Option 2: Manual SQL Migration

If you prefer to run SQL manually:

```sql
-- Step 1: Add columns with default values
ALTER TABLE "users" 
ADD COLUMN "firstName" VARCHAR DEFAULT '' NOT NULL,
ADD COLUMN "lastName" VARCHAR DEFAULT '' NOT NULL;

-- Step 2: Update existing users (extract from email)
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
WHERE "firstName" = '' OR "lastName" = '';
```

---

## What the Migration Script Does

1. **Checks if columns exist** - Skips if already migrated
2. **Adds columns with DEFAULT** - Allows existing rows
3. **Updates existing users** - Extracts names from email:
   - `john.doe@ibaseit.com` → firstName: "John", lastName: "Doe"
   - `jane@ibaseit.com` → firstName: "Jane", lastName: ""
4. **Makes columns NOT NULL** - After updating all rows

---

## After Migration

Once migration is complete:
- ✅ New registrations **require** firstName and lastName
- ✅ Existing users have values (from email or defaults)
- ✅ All API responses include firstName and lastName
- ✅ TypeORM synchronize will work correctly

---

## Verification

Check if migration worked:

```sql
SELECT id, email, "firstName", "lastName" FROM users LIMIT 5;
```

You should see:
- All users have firstName and lastName values
- No NULL values
- Names extracted from email where possible

---

## Troubleshooting

### Error: "column already exists"
- Columns were already added
- Migration script will skip automatically
- You can proceed

### Error: "permission denied"
- Check database user has ALTER TABLE permissions
- Run as database superuser if needed

### Error: Still getting NULL constraint error
- Make sure migration script completed successfully
- Check existing users have values:
  ```sql
  SELECT COUNT(*) FROM users WHERE "firstName" IS NULL OR "lastName" IS NULL;
  ```
- If count > 0, run update query manually

---

## New Registration Flow

After migration, registration requires:

```json
POST /api/auth/register
{
  "email": "john.doe@ibaseit.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation:**
- ✅ firstName: Required, min 1 character
- ✅ lastName: Required, min 1 character
- ✅ Both fields validated on registration

---

## Summary

**Run this command:**
```bash
npm run db:migrate-user-names
```

**Then start server:**
```bash
npm run dev
```

**That's it!** ✅

