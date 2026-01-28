# Idea Feed System - Design & Implementation

## Overview

The Idea Feed system implements a three-stage workflow: **PENDING → APPROVED → PUBLISHED**, with a dedicated Feed API that returns only published ideas with aggregated like and comment counts.

---

## Status Workflow

### Status Flow Diagram

```
┌─────────┐
│ PENDING │  ← User creates idea (or ADMIN auto-approves)
└────┬────┘
     │
     ├─→ Admin Approves
     │
     ▼
┌──────────┐
│ APPROVED │  ← Admin approves idea
└────┬────┘
     │
     ├─→ Admin Publishes
     │
     ▼
┌───────────┐
│ PUBLISHED │  ← Visible in Feed
└───────────┘
     │
     └─→ Users can like/comment
```

### Status Definitions

| Status | Description | Visibility | Actions Available |
|--------|-------------|------------|-------------------|
| **PENDING** | Initial status after creation | Only creator | Admin can approve/reject |
| **APPROVED** | Approved by admin, not yet published | Only creator | Admin can publish |
| **PUBLISHED** | Published and visible in feed | All users | Users can like/comment |
| **REJECTED** | Rejected by admin | Only creator | No further actions |

---

## API Endpoints

### 1. Feed API (Get Published Ideas)

**Endpoint:** `GET /api/ideas/feed`

**Description:** Returns only PUBLISHED ideas with aggregated counts

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page

**Authentication:** Optional (recommended for personalization)

**Response:**
```json
{
  "success": true,
  "data": {
    "ideas": [
      {
        "id": "uuid",
        "userId": "uuid",
        "title": "Idea Title",
        "description": "Idea description",
        "status": "PUBLISHED",
        "createdAt": "2026-01-22T...",
        "updatedAt": "2026-01-22T...",
        "user": {
          "id": "uuid",
          "email": "user@example.com"
        },
        "likesCount": 15,
        "commentsCount": 8
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

**Features:**
- ✅ Only returns PUBLISHED ideas
- ✅ Pagination support
- ✅ Aggregated like count (database-level)
- ✅ Aggregated comment count (database-level)
- ✅ Sorted by newest first
- ✅ Efficient query (single query with aggregation)

---

### 2. Create Idea

**Endpoint:** `POST /api/ideas`

**Status Assignment:**
- **Regular User:** Status = `PENDING`
- **Admin User:** Status = `APPROVED` (auto-approved)

**Response:**
```json
{
  "success": true,
  "message": "Idea created successfully. Waiting for admin approval.",
  "data": {
    "id": "uuid",
    "status": "PENDING",
    ...
  }
}
```

---

### 3. Admin: Approve Idea

**Endpoint:** `PATCH /api/admin/ideas/:id/approve`

**Description:** Changes status from `PENDING` → `APPROVED`

**Response:**
```json
{
  "success": true,
  "message": "Idea approved successfully. Ready to publish.",
  "data": {
    "id": "uuid",
    "status": "APPROVED"
  }
}
```

---

### 4. Admin: Publish Idea

**Endpoint:** `PATCH /api/admin/ideas/:id/publish`

**Description:** Changes status from `APPROVED` → `PUBLISHED`

**Response:**
```json
{
  "success": true,
  "message": "Idea published successfully. Now visible in feed.",
  "data": {
    "id": "uuid",
    "status": "PUBLISHED"
  }
}
```

---

### 5. Admin: Reject Idea

**Endpoint:** `PATCH /api/admin/ideas/:id/reject`

**Description:** Changes status from `PENDING` → `REJECTED`

**Response:**
```json
{
  "success": true,
  "message": "Idea rejected successfully",
  "data": {
    "id": "uuid",
    "status": "REJECTED"
  }
}
```

---

### 6. Get Ideas for Review (Admin)

**Endpoint:** `GET /api/admin/ideas/review`

**Description:** Returns ideas with `PENDING` status

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "ideas": [
      {
        "id": "uuid",
        "title": "Idea Title",
        "description": "Description",
        "status": "PENDING",
        "user": {
          "id": "uuid",
          "email": "user@example.com"
        },
        "createdAt": "2026-01-22T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

## Business Rules

### Status Transitions

| From | To | Condition | Who |
|------|-----|-----------|-----|
| PENDING | APPROVED | Admin approves | Admin only |
| PENDING | REJECTED | Admin rejects | Admin only |
| APPROVED | PUBLISHED | Admin publishes | Admin only |
| APPROVED | PENDING | ❌ Not allowed | - |
| PUBLISHED | APPROVED | ❌ Not allowed | - |
| REJECTED | PENDING | ❌ Not allowed | - |

### Visibility Rules

1. **PENDING Ideas:**
   - Visible only to creator
   - Visible to admins in review queue

2. **APPROVED Ideas:**
   - Visible only to creator
   - Not visible in feed
   - Admin can publish

3. **PUBLISHED Ideas:**
   - Visible to all users
   - Visible in feed
   - Users can like/comment

4. **REJECTED Ideas:**
   - Visible only to creator
   - No further actions

### Interaction Rules

- **Comments:** Only allowed on `PUBLISHED` ideas
- **Likes:** Only allowed on `PUBLISHED` ideas
- **Notifications:** Only sent for `PUBLISHED` ideas

---

## Performance Optimization

### Feed Query Optimization

The Feed API uses **database-level aggregation** instead of loading all relations:

**Before (Inefficient):**
```typescript
// Loads all likes and comments into memory
const ideas = await repository.find({
  relations: ['likes', 'comments'],
});
// Then counts in JavaScript
likesCount: idea.likes.length
```

**After (Efficient):**
```typescript
// Uses SQL COUNT aggregation
const queryBuilder = repository
  .createQueryBuilder('idea')
  .leftJoin('idea.likes', 'like')
  .leftJoin('idea.comments', 'comment')
  .addSelect('COUNT(DISTINCT like.id)', 'likesCount')
  .addSelect('COUNT(DISTINCT comment.id)', 'commentsCount')
  .groupBy('idea.id');
```

**Benefits:**
- ✅ Single database query
- ✅ No loading unnecessary data
- ✅ Faster response times
- ✅ Lower memory usage
- ✅ Scales better with large datasets

---

## Database Schema

### Idea Status Column

```sql
status ENUM('PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED')
DEFAULT 'PENDING'
```

**Index:**
```sql
CREATE INDEX idx_ideas_status ON ideas(status);
```

---

## Implementation Details

### Service Layer (`idea.service.ts`)

#### `getFeed(pagination)`
- Uses QueryBuilder for aggregation
- Filters by `PUBLISHED` status
- Aggregates like and comment counts
- Returns paginated results

#### `createIdea(userId, dto, userRole)`
- Regular users → `PENDING`
- Admin users → `APPROVED`

#### `approveIdea(id)`
- Validates status is `PENDING`
- Changes to `APPROVED`

#### `publishIdea(id)`
- Validates status is `APPROVED`
- Changes to `PUBLISHED`

#### `rejectIdea(id)`
- Validates status is `PENDING`
- Changes to `REJECTED`

---

## Migration Guide

### For Existing Data

If you have existing ideas with `REVIEW` status:

```sql
-- Update REVIEW to PENDING
UPDATE ideas SET status = 'PENDING' WHERE status = 'REVIEW';

-- Update APPROVED to PUBLISHED (if you want existing approved ideas in feed)
UPDATE ideas SET status = 'PUBLISHED' WHERE status = 'APPROVED';
```

---

## API Usage Examples

### Get Feed (First Page)

```bash
GET /api/ideas/feed?page=1&limit=10
```

### Get Feed (Next Page)

```bash
GET /api/ideas/feed?page=2&limit=10
```

### Admin Workflow

1. **Get pending ideas:**
   ```bash
   GET /api/admin/ideas/review
   ```

2. **Approve idea:**
   ```bash
   PATCH /api/admin/ideas/:id/approve
   ```

3. **Publish idea:**
   ```bash
   PATCH /api/admin/ideas/:id/publish
   ```

---

## Testing Scenarios

### Test Case 1: User Creates Idea
1. User creates idea
2. **Expected:** Status = `PENDING`
3. **Expected:** Not visible in feed

### Test Case 2: Admin Approves
1. Admin approves pending idea
2. **Expected:** Status = `APPROVED`
3. **Expected:** Still not visible in feed

### Test Case 3: Admin Publishes
1. Admin publishes approved idea
2. **Expected:** Status = `PUBLISHED`
3. **Expected:** Visible in feed
4. **Expected:** Users can like/comment

### Test Case 4: Feed Returns Only Published
1. Create ideas with different statuses
2. Call feed API
3. **Expected:** Only `PUBLISHED` ideas returned

### Test Case 5: Aggregation Works
1. Publish idea with 10 likes and 5 comments
2. Call feed API
3. **Expected:** `likesCount: 10`, `commentsCount: 5`

---

## Benefits

1. **Clear Workflow:** Three-stage process is intuitive
2. **Better Control:** Admins can approve without immediately publishing
3. **Performance:** Database aggregation is efficient
4. **Scalability:** Handles large datasets well
5. **Flexibility:** Can schedule publishing or batch operations

---

## Files Modified

1. ✅ `src/enums/IdeaStatus.ts` - Updated enum values
2. ✅ `src/entities/Idea.ts` - Updated default status
3. ✅ `src/services/idea.service.ts` - Added feed method, updated workflow
4. ✅ `src/services/comment.service.ts` - Updated to check PUBLISHED
5. ✅ `src/services/like.service.ts` - Updated to check PUBLISHED
6. ✅ `src/controllers/idea.controller.ts` - Added feed endpoint
7. ✅ `src/controllers/admin.controller.ts` - Added publish endpoint
8. ✅ `src/routes/idea.routes.ts` - Added feed route
9. ✅ `src/routes/admin.routes.ts` - Added publish route

---

## Summary

✅ **Status Workflow:** PENDING → APPROVED → PUBLISHED  
✅ **Feed API:** Returns only PUBLISHED ideas  
✅ **Pagination:** Full pagination support  
✅ **Aggregation:** Database-level like/comment counts  
✅ **Performance:** Optimized queries  

**Idea Feed System complete and ready to use!** 🎉

