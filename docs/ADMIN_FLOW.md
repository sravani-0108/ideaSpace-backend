# Admin Authentication & Authorization Flow

## Overview

When an admin logs in, the system:
1. ✅ Generates JWT token with role from database
2. ✅ Validates token and fetches user from database
3. ✅ Checks role from database (not just JWT)
4. ✅ Allows admin to review and approve ideas

---

## 🔐 Step-by-Step Flow

### 1. Admin Login

**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "adminpassword"
}
```

**Process:**
```typescript
// auth.service.ts - login()
1. Find user in database by email
2. Check if email is verified
3. Verify password
4. Generate JWT token with role from database:
   {
     userId: "uuid",
     email: "admin@company.com",
     role: "ADMIN"  // ← Role from database
   }
5. Return token + user info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@company.com",
      "role": "ADMIN"
    }
  }
}
```

---

### 2. Admin Accesses Protected Route

**Request:**
```http
GET /api/admin/ideas/review
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Process:**

#### Step 1: Auth Middleware (`auth.middleware.ts`)
```typescript
1. Extract token from Authorization header
2. Verify JWT token
3. Get userId from token payload
4. Fetch user from database (IMPORTANT: Gets fresh role from DB)
5. Attach user object to request (req.user)
```

#### Step 2: Admin Middleware (`admin.middleware.ts`)
```typescript
1. Check if req.user exists (from auth middleware)
2. Check req.user.role === UserRole.ADMIN
   // ← Role checked from DATABASE, not just JWT!
3. If admin → allow access
4. If not admin → return 403 Forbidden
```

#### Step 3: Admin Controller
```typescript
// admin.controller.ts
1. Get ideas in REVIEW status
2. Return to admin
```

---

## ✅ Security Features

### 1. Role Always Checked from Database
- JWT token contains role for convenience
- **But role is verified from database** in `authMiddleware`
- If admin role is changed in database, it takes effect immediately
- More secure than trusting JWT role alone

### 2. Double Protection
```typescript
// admin.routes.ts
router.use(authMiddleware);    // 1. Must be authenticated
router.use(adminMiddleware);   // 2. Must be admin
```

### 3. Database-Driven Authorization
```typescript
// auth.middleware.ts
const user = await userRepository.findOne({
  where: { id: payload.userId },
});
req.user = user;  // ← Fresh user data from database

// admin.middleware.ts
if (req.user.role !== UserRole.ADMIN) {  // ← Checks DB role
  return 403;
}
```

---

## 🎯 Admin Capabilities

### Admin Can:
1. ✅ **View all REVIEW ideas**
   ```
   GET /api/admin/ideas/review
   ```

2. ✅ **Approve ideas**
   ```
   PATCH /api/admin/ideas/:id/approve
   ```

3. ✅ **Reject ideas**
   ```
   PATCH /api/admin/ideas/:id/reject
   ```

### Admin Cannot:
- ❌ Regular users cannot access admin routes (403 Forbidden)
- ❌ Even with valid JWT, non-admin users get blocked

---

## 📋 Code Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Admin Login Request                                     │
│  POST /api/auth/login                                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  AuthService.login()                                     │
│  1. Find user in DB                                      │
│  2. Verify password                                      │
│  3. Generate JWT with role from DB                      │
│     { userId, email, role: "ADMIN" }                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Client receives JWT token                               │
│  Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Admin Request with JWT                                  │
│  GET /api/admin/ideas/review                            │
│  Authorization: Bearer <token>                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  authMiddleware                                          │
│  1. Extract token                                        │
│  2. Verify JWT                                           │
│  3. Get userId from token                                │
│  4. Fetch user from DATABASE ← Fresh role!              │
│  5. Attach user to req.user                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  adminMiddleware                                         │
│  1. Check req.user exists                                │
│  2. Check req.user.role === "ADMIN" ← From DB!         │
│  3. If admin → next()                                    │
│  4. If not → 403 Forbidden                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  AdminController.getIdeasForReview()                     │
│  Returns all ideas in REVIEW status                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Implementation Details

### JWT Token Structure
```typescript
// jwt.util.ts
interface JWTPayload {
  userId: string;
  email: string;
  role: string;  // Included for convenience
}
```

### Auth Middleware
```typescript
// auth.middleware.ts
// IMPORTANT: Fetches user from database
const user = await userRepository.findOne({
  where: { id: payload.userId },
});
req.user = user;  // ← Contains fresh role from database
```

### Admin Middleware
```typescript
// admin.middleware.ts
// Checks role from database user object
if (req.user.role !== UserRole.ADMIN) {
  return res.status(403).json({
    success: false,
    message: 'Admin access required'
  });
}
```

---

## ✅ Verification Checklist

- ✅ JWT token includes role from database
- ✅ Auth middleware fetches user from database
- ✅ Admin middleware checks role from database (not JWT)
- ✅ Admin routes protected with both middlewares
- ✅ Non-admin users get 403 Forbidden
- ✅ Role changes in database take effect immediately

---

## 🧪 Testing Admin Flow

### 1. Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password"
  }'
```

### 2. Use Token to Access Admin Routes
```bash
curl -X GET http://localhost:5000/api/admin/ideas/review \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Approve an Idea
```bash
curl -X PATCH http://localhost:5000/api/admin/ideas/ID/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎓 Summary

**The system is secure because:**
1. Role is stored in database (single source of truth)
2. JWT token includes role for convenience
3. Auth middleware fetches fresh user data from database
4. Admin middleware checks database role (not JWT role)
5. If admin role changes in DB, it takes effect immediately

**Admin can review and approve ideas because:**
- JWT token contains admin role
- Database confirms admin role
- Admin middleware allows access
- Admin routes are properly protected

Everything is working correctly! 🚀

