# Admin Auto-Approval Feature

## Overview

When an **ADMIN** user creates an idea, it is **automatically approved** and published immediately. Regular **USER** ideas still go through the review process.

---

## Implementation Details

### 1. **Service Layer** (`src/services/idea.service.ts`)

**Updated `createIdea` method:**

```typescript
async createIdea(userId: string, createIdeaDto: CreateIdeaDto, userRole?: UserRole): Promise<Idea> {
  // Admin ideas are automatically approved, regular users go to REVIEW
  const status = userRole === UserRole.ADMIN ? IdeaStatus.APPROVED : IdeaStatus.REVIEW;

  const idea = this.ideaRepository.create({
    userId,
    title: createIdeaDto.title,
    description: createIdeaDto.description,
    status, // Auto-set based on role
  });

  return await this.ideaRepository.save(idea);
}
```

**Changes:**
- Added optional `userRole` parameter
- Checks if role is `ADMIN`
- Sets status to `APPROVED` for admins, `REVIEW` for regular users

---

### 2. **Controller Layer** (`src/controllers/idea.controller.ts`)

**Updated `createIdea` method:**

```typescript
async createIdea(req: AuthRequest, res: Response): Promise<void> {
  try {
    const createIdeaDto: CreateIdeaDto = req.body;
    // Get user role from the authenticated user object
    const userRole = req.user?.role as UserRole;
    const idea = await ideaService.createIdea(req.userId!, createIdeaDto, userRole);

    const response: ApiResponse<any> = {
      success: true,
      data: idea,
      message: userRole === UserRole.ADMIN 
        ? 'Idea created and automatically approved' 
        : 'Idea created successfully. Waiting for admin approval.',
    };

    res.status(201).json(response);
  } catch (error: any) {
    // ... error handling
  }
}
```

**Changes:**
- Extracts `userRole` from `req.user.role` (set by auth middleware)
- Passes role to service method
- Returns appropriate success message based on role

---

## How It Works

### Flow Diagram

```
User Creates Idea
    │
    ├─→ Auth Middleware validates token
    │   └─→ Sets req.user (includes role)
    │
    ├─→ Controller extracts role
    │   └─→ req.user.role
    │
    ├─→ Service checks role
    │   ├─→ ADMIN? → Status = APPROVED ✅
    │   └─→ USER? → Status = REVIEW ⏳
    │
    └─→ Idea saved with appropriate status
```

---

## Behavior

### **Admin User** (`role: ADMIN`)
- ✅ Idea created with status: `APPROVED`
- ✅ Immediately visible to all users
- ✅ Can receive comments and likes immediately
- ✅ Response message: "Idea created and automatically approved"

### **Regular User** (`role: USER`)
- ⏳ Idea created with status: `REVIEW`
- ⏳ Not visible to other users until approved
- ⏳ Only visible to the creator
- ⏳ Response message: "Idea created successfully. Waiting for admin approval."

---

## API Response Examples

### Admin Creates Idea

**Request:**
```http
POST /api/ideas
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "title": "New Feature Idea",
  "description": "Add dark mode support"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Idea created and automatically approved",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "New Feature Idea",
    "description": "Add dark mode support",
    "status": "APPROVED",
    "createdAt": "2026-01-22T...",
    "updatedAt": "2026-01-22T..."
  }
}
```

### Regular User Creates Idea

**Request:**
```http
POST /api/ideas
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "title": "New Feature Idea",
  "description": "Add dark mode support"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Idea created successfully. Waiting for admin approval.",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "New Feature Idea",
    "description": "Add dark mode support",
    "status": "REVIEW",
    "createdAt": "2026-01-22T...",
    "updatedAt": "2026-01-22T..."
  }
}
```

---

## Security Considerations

### ✅ **Role Verification**
- Role is extracted from the authenticated user object (`req.user`)
- Set by `authMiddleware` after validating JWT token
- Cannot be spoofed - comes from database lookup

### ✅ **Token-Based**
- Role is stored in JWT token payload
- Auth middleware validates token and loads user from database
- Ensures role is current and accurate

### ✅ **Type Safety**
- Uses `UserRole` enum for type checking
- TypeScript ensures correct role values

---

## Testing Scenarios

### Test Case 1: Admin Creates Idea
1. Login as ADMIN user
2. Create idea via POST `/api/ideas`
3. **Expected:** Status = `APPROVED`
4. **Expected:** Idea visible in `/api/ideas` (approved ideas list)
5. **Expected:** Can receive comments/likes immediately

### Test Case 2: Regular User Creates Idea
1. Login as USER
2. Create idea via POST `/api/ideas`
3. **Expected:** Status = `REVIEW`
4. **Expected:** Idea NOT visible in `/api/ideas` (only approved ideas)
5. **Expected:** Idea visible in `/api/ideas/my-ideas` (user's own ideas)
6. **Expected:** Admin can see it in `/api/admin/ideas/review`

### Test Case 3: Admin Approves Regular User's Idea
1. Regular user creates idea (status = REVIEW)
2. Admin views ideas in review: GET `/api/admin/ideas/review`
3. Admin approves: POST `/api/admin/ideas/:id/approve`
4. **Expected:** Status changes to `APPROVED`
5. **Expected:** Idea now visible to all users

---

## Benefits

1. **Efficiency**: Admins can publish ideas immediately without self-review
2. **Flexibility**: Regular users still go through approval process
3. **Clear Messaging**: Users know immediately if their idea is approved
4. **Role-Based**: Leverages existing role system
5. **Backward Compatible**: Existing functionality unchanged

---

## Files Modified

1. ✅ `src/services/idea.service.ts`
   - Added `userRole` parameter to `createIdea` method
   - Added role-based status logic

2. ✅ `src/controllers/idea.controller.ts`
   - Extract role from `req.user`
   - Pass role to service
   - Return role-specific success message

---

## Related Features

- **Admin Review**: Admins can still review and approve/reject regular user ideas
- **My Ideas**: Users can see their own ideas regardless of status
- **Approved Ideas**: Only approved ideas are visible to all users
- **Notifications**: Notifications only sent for approved ideas

---

## Summary

✅ **Admin ideas**: Auto-approved, immediately published  
⏳ **User ideas**: Go to review, require admin approval  
🔒 **Security**: Role verified from authenticated user  
📝 **Messages**: Clear feedback based on role  

**Implementation complete and ready to use!** 🎉

