# Database Table Design & Entity Structure

## 📊 Complete Database Schema

### Table Relationships Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK, UUID)   │
│ email (UNIQUE)  │
│ password        │
│ role (ENUM)     │
│ isVerified      │
│ createdAt       │
│ updatedAt       │
└────────┬────────┘
         │
         ├─────────────────────────────────────────────┐
         │                                             │
         │ 1:1                                        │ 1:Many
         │                                             │
         ▼                                             ▼
┌──────────────────────┐                    ┌─────────────────┐
│ email_verifications  │                    │     ideas       │
│──────────────────────│                    │─────────────────│
│ id (PK, UUID)        │                    │ id (PK, UUID)   │
│ userId (FK)          │                    │ userId (FK)     │
│ otp                  │                    │ title           │
│ expiresAt            │                    │ description      │
│ createdAt            │                    │ status (ENUM)    │
└──────────────────────┘                    │ createdAt       │
                                            │ updatedAt       │
                                            └────────┬────────┘
                                                     │
                                                     │ 1:Many
                                                     │
                    ┌────────────────────────────────┼────────────────────┐
                    │                                │                    │
                    ▼                                ▼                    ▼
            ┌──────────────┐                ┌──────────────┐    ┌──────────────────┐
            │   comments   │                │    likes     │    │  notifications   │
            │──────────────│                │──────────────│    │──────────────────│
            │ id (PK, UUID)│                │ id (PK, UUID)│    │ id (PK, UUID)   │
            │ ideaId (FK)  │                │ ideaId (FK)  │    │ userId (FK)      │
            │ userId (FK)  │                │ userId (FK)  │    │ ideaId (FK)      │
            │ content      │                │ createdAt    │    │ type (ENUM)      │
            │ createdAt    │                │ UNIQUE(idea, │    │ isRead           │
            │ updatedAt    │                │      user)    │    │ createdAt        │
            └──────────────┘                └──────────────┘    └──────────────────┘
```

---

## 📋 Table Details

### 1. **users** Table
**Purpose:** Store user accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique user identifier |
| `email` | VARCHAR | UNIQUE, NOT NULL | User email (company email only) |
| `password` | VARCHAR | NOT NULL | Hashed password (bcrypt) |
| `role` | ENUM | DEFAULT 'USER' | User role: USER, ADMIN |
| `isVerified` | BOOLEAN | DEFAULT false | Email verification status |
| `createdAt` | TIMESTAMP | NOT NULL | Account creation time |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update time |

**Indexes:**
- Primary Key: `id`
- Unique Index: `email`
- Index: `role` (for admin queries)

**Relations:**
- One-to-One: `email_verifications` (temporary OTP)
- One-to-Many: `ideas` (user's ideas)
- One-to-Many: `comments` (user's comments)
- One-to-Many: `likes` (user's likes)
- One-to-Many: `notifications` (user's notifications)

---

### 2. **email_verifications** Table
**Purpose:** Temporary storage for OTP codes during email verification

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique verification record |
| `userId` | UUID | FOREIGN KEY → users.id | User being verified |
| `otp` | VARCHAR | NOT NULL | 6-digit OTP code |
| `expiresAt` | TIMESTAMP | NOT NULL | OTP expiration time (10 min) |
| `createdAt` | TIMESTAMP | NOT NULL | OTP generation time |

**Indexes:**
- Primary Key: `id`
- Foreign Key: `userId` → `users.id`
- Unique: `userId` (one active verification per user)

**Relations:**
- Many-to-One: `users` (one verification per user)

**Lifecycle:**
- Created: When user registers
- Updated: When OTP is resent
- Deleted: After successful verification or expiration

---

### 3. **ideas** Table
**Purpose:** Store user-submitted ideas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique idea identifier |
| `userId` | UUID | FOREIGN KEY → users.id | Idea creator |
| `title` | VARCHAR | NOT NULL | Idea title |
| `description` | TEXT | NOT NULL | Idea description |
| `status` | ENUM | DEFAULT 'REVIEW' | Status: REVIEW, APPROVED, REJECTED |
| `createdAt` | TIMESTAMP | NOT NULL | Idea creation time |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update time |

**Indexes:**
- Primary Key: `id`
- Foreign Key: `userId` → `users.id`
- Index: `status` (for filtering by status)
- Index: `createdAt` (for sorting)

**Relations:**
- Many-to-One: `users` (idea creator)
- One-to-Many: `comments` (comments on idea)
- One-to-Many: `likes` (likes on idea)
- One-to-Many: `notifications` (notifications about idea)

---

### 4. **comments** Table
**Purpose:** Store comments on approved ideas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique comment identifier |
| `ideaId` | UUID | FOREIGN KEY → ideas.id | Idea being commented on |
| `userId` | UUID | FOREIGN KEY → users.id | Comment author |
| `content` | TEXT | NOT NULL | Comment text |
| `createdAt` | TIMESTAMP | NOT NULL | Comment creation time |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update time |

**Indexes:**
- Primary Key: `id`
- Foreign Key: `ideaId` → `ideas.id`
- Foreign Key: `userId` → `users.id`
- Index: `ideaId` (for fetching comments by idea)
- Index: `createdAt` (for sorting)

**Relations:**
- Many-to-One: `ideas` (commented idea)
- Many-to-One: `users` (comment author)

**Business Rules:**
- Only approved ideas can have comments
- Users can comment multiple times on same idea

---

### 5. **likes** Table
**Purpose:** Store likes on approved ideas

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique like identifier |
| `ideaId` | UUID | FOREIGN KEY → ideas.id | Liked idea |
| `userId` | UUID | FOREIGN KEY → users.id | User who liked |
| `createdAt` | TIMESTAMP | NOT NULL | Like creation time |

**Indexes:**
- Primary Key: `id`
- Foreign Key: `ideaId` → `ideas.id`
- Foreign Key: `userId` → `users.id`
- **Unique Constraint:** `(ideaId, userId)` - one like per user per idea

**Relations:**
- Many-to-One: `ideas` (liked idea)
- Many-to-One: `users` (user who liked)

**Business Rules:**
- Only approved ideas can be liked
- One like per user per idea (enforced by unique constraint)

---

### 6. **notifications** Table
**Purpose:** Store in-app notifications for users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique notification identifier |
| `userId` | UUID | FOREIGN KEY → users.id | Notification recipient |
| `ideaId` | UUID | FOREIGN KEY → ideas.id | Related idea |
| `type` | ENUM | NOT NULL | Type: COMMENT, LIKE |
| `isRead` | BOOLEAN | DEFAULT false | Read status |
| `createdAt` | TIMESTAMP | NOT NULL | Notification creation time |

**Indexes:**
- Primary Key: `id`
- Foreign Key: `userId` → `users.id`
- Foreign Key: `ideaId` → `ideas.id`
- Index: `userId, isRead` (for fetching unread notifications)
- Index: `createdAt` (for sorting)

**Relations:**
- Many-to-One: `users` (notification recipient)
- Many-to-One: `ideas` (related idea)

**Business Rules:**
- Created when someone comments/likes an idea
- Not created if user comments/likes their own idea
- Can be marked as read individually or all at once

---

## 🔗 Relationship Summary

### One-to-One Relationships
- `users` ↔ `email_verifications` (one active verification per user)

### One-to-Many Relationships
- `users` → `ideas` (user creates many ideas)
- `users` → `comments` (user makes many comments)
- `users` → `likes` (user likes many ideas)
- `users` → `notifications` (user receives many notifications)
- `ideas` → `comments` (idea has many comments)
- `ideas` → `likes` (idea has many likes)
- `ideas` → `notifications` (idea generates many notifications)

---

## 🎯 Design Principles Applied

### ✅ **Normalization**
- Each table has a single responsibility
- No redundant data storage
- Foreign keys maintain referential integrity

### ✅ **Performance**
- Indexes on frequently queried columns
- Composite indexes for common query patterns
- Unique constraints prevent duplicates

### ✅ **Data Integrity**
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate likes
- Enum types ensure valid status/role values

### ✅ **Scalability**
- UUID primary keys (distributed-friendly)
- Indexed foreign keys for fast joins
- Proper timestamp columns for auditing

---

## 📈 Query Patterns & Indexes

### Common Queries & Their Indexes

1. **Get user's ideas**
   - Query: `SELECT * FROM ideas WHERE userId = ?`
   - Index: `userId` (FK automatically indexed)

2. **Get idea with comments and likes**
   - Query: `SELECT * FROM ideas LEFT JOIN comments ON ... LEFT JOIN likes ON ...`
   - Indexes: `ideaId` in comments and likes tables

3. **Get unread notifications**
   - Query: `SELECT * FROM notifications WHERE userId = ? AND isRead = false`
   - Index: `(userId, isRead)` composite index

4. **Check if user liked idea**
   - Query: `SELECT * FROM likes WHERE ideaId = ? AND userId = ?`
   - Index: Unique constraint `(ideaId, userId)` ensures fast lookup

5. **Get comments on idea (sorted)**
   - Query: `SELECT * FROM comments WHERE ideaId = ? ORDER BY createdAt DESC`
   - Index: `(ideaId, createdAt)` composite index

---

## 🔄 Cascade Behaviors

### On User Delete
- **Cascade Delete:** `email_verifications` (OneToOne with cascade)
- **Set Null/Delete:** `ideas`, `comments`, `likes`, `notifications` (decide based on business rules)

### On Idea Delete
- **Cascade Delete:** `comments`, `likes`, `notifications` (all related data)

### On Comment Delete
- **No cascade needed** (standalone entity)

### On Like Delete
- **No cascade needed** (standalone entity)

---

## ✅ Summary

**Total Tables:** 6
**Total Relationships:** 11 (1 One-to-One, 10 One-to-Many)
**Total Indexes:** ~15 (including PKs, FKs, and custom indexes)

**Design Quality:**
- ✅ Normalized (3NF)
- ✅ Properly indexed
- ✅ Referential integrity enforced
- ✅ Scalable structure
- ✅ No code duplication (using base entity)

