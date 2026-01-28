# Comment Replies Feature

## Overview

Users can now reply to comments, creating threaded discussions. Replies are stored in the database with a parent-child relationship and displayed in a nested structure.

---

## Database Structure

### Comment Entity Updates

**New Fields:**
- `parentId` (nullable UUID) - Reference to parent comment if this is a reply
- `parent` (ManyToOne relation) - Parent comment
- `replies` (OneToMany relation) - Child comments (replies)

**Self-Referencing Relationship:**
```
Comment
├── parentId (nullable) → References another Comment.id
├── parent → Comment (ManyToOne)
└── replies → Comment[] (OneToMany)
```

---

## API Endpoints

### Create Comment (Top-Level)

**Endpoint:** `POST /api/ideas/:ideaId/comments`

**Request:**
```json
{
  "content": "This is a great idea!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "uuid",
    "ideaId": "uuid",
    "userId": "uuid",
    "content": "This is a great idea!",
    "parentId": null,
    "createdAt": "2026-01-22T...",
    "updatedAt": "2026-01-22T...",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

---

### Create Reply (Nested Comment)

**Endpoint:** `POST /api/ideas/:ideaId/comments`

**Request:**
```json
{
  "content": "I agree with your point!",
  "parentId": "comment-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reply added successfully",
  "data": {
    "id": "uuid",
    "ideaId": "uuid",
    "userId": "uuid",
    "content": "I agree with your point!",
    "parentId": "comment-uuid-here",
    "createdAt": "2026-01-22T...",
    "updatedAt": "2026-01-22T...",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "parent": {
      "id": "comment-uuid-here",
      "content": "This is a great idea!",
      "user": {
        "id": "uuid",
        "email": "original@example.com"
      }
    }
  }
}
```

---

### Get Idea with Nested Comments

**Endpoint:** `GET /api/ideas/:id`

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "id": "idea-uuid",
    "title": "Idea Title",
    "description": "Idea description",
    "comments": [
      {
        "id": "comment-1",
        "content": "First comment",
        "parentId": null,
        "createdAt": "2026-01-22T...",
        "user": { "id": "uuid", "email": "user1@example.com" },
        "replies": [
          {
            "id": "reply-1",
            "content": "Reply to first comment",
            "parentId": "comment-1",
            "createdAt": "2026-01-22T...",
            "user": { "id": "uuid", "email": "user2@example.com" },
            "replies": []
          }
        ]
      },
      {
        "id": "comment-2",
        "content": "Second comment",
        "parentId": null,
        "createdAt": "2026-01-22T...",
        "user": { "id": "uuid", "email": "user3@example.com" },
        "replies": []
      }
    ]
  }
}
```

---

## Features

### ✅ **Nested Replies**
- Comments can have unlimited depth (replies to replies)
- Stored in database with parent-child relationship
- Displayed in nested structure

### ✅ **Validation**
- Validates parent comment exists
- Validates parent comment belongs to same idea
- Prevents circular references

### ✅ **Notifications**
- Idea creator gets notified of new comments/replies
- Parent comment author gets notified of replies (if different from idea creator)
- No duplicate notifications

### ✅ **Data Structure**
- Top-level comments have `parentId: null`
- Replies have `parentId: <comment-id>`
- Comments sorted by creation date (newest first)
- Replies sorted by creation date (oldest first)

---

## Business Rules

1. **Only approved ideas** can have comments/replies
2. **Parent comment must exist** and belong to the same idea
3. **No circular references** - parent cannot be a child of itself
4. **Notifications sent to:**
   - Idea creator (for all comments/replies)
   - Parent comment author (for replies, if different from idea creator)

---

## Database Schema

### Comments Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Comment identifier |
| `ideaId` | UUID | FOREIGN KEY → ideas.id | Related idea |
| `userId` | UUID | FOREIGN KEY → users.id | Comment author |
| `content` | TEXT | NOT NULL | Comment text |
| `parentId` | UUID | FOREIGN KEY → comments.id, NULLABLE | Parent comment (null for top-level) |
| `createdAt` | TIMESTAMP | NOT NULL | Creation time |
| `updatedAt` | TIMESTAMP | NOT NULL | Last update time |

**Indexes:**
- `ideaId` - For fetching comments by idea
- `userId` - For user's comments
- `parentId` - For fetching replies
- `(ideaId, createdAt)` - Composite for sorted comments

---

## Implementation Details

### 1. **Comment Entity** (`src/entities/Comment.ts`)

```typescript
@Entity('comments')
export class Comment extends BaseEntityWithUpdate {
  // ... existing fields
  
  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => Comment, comment => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Comment;

  @OneToMany(() => Comment, comment => comment.parent)
  replies: Comment[];
}
```

### 2. **DTO** (`src/dto/comment.dto.ts`)

```typescript
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsUUID(4)
  parentId?: string; // Optional: if provided, this is a reply
}
```

### 3. **Service Logic** (`src/services/comment.service.ts`)

- Validates parent comment exists
- Validates parent belongs to same idea
- Creates notification for idea creator
- Creates notification for parent comment author (if different)

### 4. **Response Structure** (`src/services/idea.service.ts`)

- Loads comments with replies relation
- Structures as nested tree
- Top-level comments sorted newest first
- Replies sorted oldest first (chronological discussion)

---

## Frontend Integration

### Creating a Top-Level Comment

```typescript
POST /api/ideas/:ideaId/comments
{
  "content": "My comment"
}
```

### Creating a Reply

```typescript
POST /api/ideas/:ideaId/comments
{
  "content": "My reply",
  "parentId": "comment-uuid"
}
```

### Displaying Comments

```typescript
GET /api/ideas/:id

// Response includes nested structure:
{
  comments: [
    {
      id: "comment-1",
      content: "...",
      replies: [
        {
          id: "reply-1",
          content: "...",
          replies: [] // Can have more nested replies
        }
      ]
    }
  ]
}
```

---

## Example Flow

1. **User A** creates idea → Status: APPROVED
2. **User B** comments: "Great idea!" → Top-level comment
3. **User C** replies to User B: "I agree!" → Reply (parentId = User B's comment)
4. **User A** replies to User C: "Thanks!" → Reply to reply (parentId = User C's comment)

**Result Structure:**
```
Comment (User B)
└── Reply (User C)
    └── Reply (User A)
```

---

## Error Handling

### Invalid Parent Comment
```json
{
  "success": false,
  "message": "Parent comment not found"
}
```

### Parent Comment Wrong Idea
```json
{
  "success": false,
  "message": "Parent comment does not belong to this idea"
}
```

### Idea Not Approved
```json
{
  "success": false,
  "message": "Comments can only be added to approved ideas"
}
```

---

## Testing Scenarios

### Test Case 1: Create Top-Level Comment
1. POST `/api/ideas/:id/comments` with `{ "content": "Comment" }`
2. **Expected:** Comment created with `parentId: null`
3. **Expected:** Notification sent to idea creator

### Test Case 2: Create Reply
1. POST `/api/ideas/:id/comments` with `{ "content": "Reply", "parentId": "comment-id" }`
2. **Expected:** Reply created with `parentId: comment-id`
3. **Expected:** Notifications sent to idea creator and parent comment author

### Test Case 3: Get Idea with Nested Comments
1. GET `/api/ideas/:id`
2. **Expected:** Comments returned in nested structure
3. **Expected:** Top-level comments sorted newest first
4. **Expected:** Replies sorted oldest first

### Test Case 4: Invalid Parent
1. POST with invalid `parentId`
2. **Expected:** Error "Parent comment not found"

---

## Benefits

1. **Better Discussions**: Threaded conversations are easier to follow
2. **Context Preservation**: Replies maintain context of parent comment
3. **User Engagement**: Users can discuss specific points
4. **Scalable**: Supports unlimited nesting depth
5. **Notifications**: Users notified of relevant replies

---

## Files Modified

1. ✅ `src/entities/Comment.ts` - Added parent-child relationship
2. ✅ `src/dto/comment.dto.ts` - Added optional `parentId`
3. ✅ `src/services/comment.service.ts` - Added reply validation and notifications
4. ✅ `src/controllers/comment.controller.ts` - Updated response handling
5. ✅ `src/services/idea.service.ts` - Updated to return nested comments

---

## Summary

✅ **Nested replies** - Comments can have replies  
✅ **Database storage** - Parent-child relationship in DB  
✅ **Validation** - Parent comment validation  
✅ **Notifications** - Smart notification system  
✅ **Nested structure** - Properly structured responses  

**Feature complete and ready to use!** 🎉

