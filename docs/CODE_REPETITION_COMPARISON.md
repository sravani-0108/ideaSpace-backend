# Code Repetition Comparison: Single Table vs Separate Tables

## Current Implementation (Single Table) ✅

### **NO Code Repetition!**

Both Comment and Like services use the **SAME** `NotificationService`:

```typescript
// CommentService.ts
this.notificationService.createNotification(
  idea.userId, 
  ideaId, 
  NotificationType.COMMENT
);

// LikeService.ts  
this.notificationService.createNotification(
  idea.userId, 
  ideaId, 
  NotificationType.LIKE
);
```

**Same method, just different `type` parameter!** ✅

---

## If We Used 2 Separate Tables ❌

### **YES - Code Repetition Would Happen!**

You would need **duplicate code** for each notification type:

### **Option 1: Separate Services (Repetition)**

```typescript
// CommentNotificationService.ts
export class CommentNotificationService {
  private repo = AppDataSource.getRepository(CommentNotification);
  
  async createNotification(userId: string, ideaId: string) {
    const notification = this.repo.create({
      userId,
      ideaId,
      isRead: false,
    });
    return await this.repo.save(notification);
  }
  
  async getUserNotifications(userId: string) {
    return await this.repo.find({
      where: { userId },
      relations: ['idea'],
      order: { createdAt: 'DESC' },
    });
  }
  
  async getUnreadCount(userId: string) {
    return await this.repo.count({
      where: { userId, isRead: false },
    });
  }
  
  async markAsRead(id: string, userId: string) {
    const notification = await this.repo.findOne({
      where: { id, userId },
    });
    if (!notification) throw new Error('Not found');
    notification.isRead = true;
    return await this.repo.save(notification);
  }
  
  async markAllAsRead(userId: string) {
    await this.repo.update(
      { userId, isRead: false },
      { isRead: true }
    );
  }
}

// LikeNotificationService.ts
export class LikeNotificationService {
  private repo = AppDataSource.getRepository(LikeNotification);
  
  // ⚠️ EXACT SAME CODE REPEATED! ⚠️
  async createNotification(userId: string, ideaId: string) {
    const notification = this.repo.create({
      userId,
      ideaId,
      isRead: false,
    });
    return await this.repo.save(notification);
  }
  
  async getUserNotifications(userId: string) {
    return await this.repo.find({
      where: { userId },
      relations: ['idea'],
      order: { createdAt: 'DESC' },
    });
  }
  
  // ... ALL METHODS REPEATED!
}
```

**Result: ~50 lines of code × 2 = 100+ lines (with duplication)**

---

### **Option 2: Separate Controllers (More Repetition)**

```typescript
// CommentNotificationController.ts
export class CommentNotificationController {
  private service = new CommentNotificationService();
  
  async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.userId!;
    const notifications = await this.service.getUserNotifications(userId);
    res.json({ success: true, data: notifications });
  }
  
  async getUnreadCount(req: AuthRequest, res: Response) {
    const userId = req.userId!;
    const count = await this.service.getUnreadCount(userId);
    res.json({ success: true, count });
  }
  
  // ... more methods
}

// LikeNotificationController.ts
export class LikeNotificationController {
  private service = new LikeNotificationService();
  
  // ⚠️ EXACT SAME CODE REPEATED! ⚠️
  async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.userId!;
    const notifications = await this.service.getUserNotifications(userId);
    res.json({ success: true, data: notifications });
  }
  
  // ... ALL METHODS REPEATED!
}
```

---

### **Option 3: Merging Results (Complex & Inefficient)**

If you want to show all notifications together, you'd need:

```typescript
// NotificationService.ts (would need to merge)
async getUserNotifications(userId: string) {
  // Query BOTH tables
  const commentNotifications = await commentNotificationRepo.find({
    where: { userId },
    relations: ['idea'],
  });
  
  const likeNotifications = await likeNotificationRepo.find({
    where: { userId },
    relations: ['idea'],
  });
  
  // Merge and sort manually
  const all = [...commentNotifications, ...likeNotifications]
    .sort((a, b) => b.createdAt - a.createdAt);
  
  return all;
}
```

**Problems:**
- ❌ Two database queries instead of one
- ❌ Manual merging and sorting
- ❌ More complex code
- ❌ Slower performance

---

## Current Single Table Approach ✅

### **Zero Repetition!**

```typescript
// ONE NotificationService (used by both)
export class NotificationService {
  async createNotification(userId, ideaId, type) {
    // Works for both COMMENT and LIKE
  }
  
  async getUserNotifications(userId) {
    // Returns both types in one query
  }
  
  // All methods work for both types!
}

// CommentService.ts
notificationService.createNotification(..., NotificationType.COMMENT);

// LikeService.ts
notificationService.createNotification(..., NotificationType.LIKE);
```

**Result: ~50 lines of code, NO duplication** ✅

---

## Code Comparison Table

| Aspect | Single Table (Current) | 2 Separate Tables |
|--------|------------------------|-------------------|
| **Service Methods** | 1 set (shared) | 2 sets (duplicated) |
| **Controller Methods** | 1 set (shared) | 2 sets (duplicated) |
| **Routes** | 4 endpoints | 8 endpoints (duplicated) |
| **Total Lines of Code** | ~100 lines | ~200+ lines |
| **Code Repetition** | ✅ **ZERO** | ❌ **HIGH** |
| **Maintenance** | Change once | Change twice |
| **Bug Fixes** | Fix once | Fix twice |

---

## Real-World Example

### **Scenario: Add "mark as read" feature**

**Single Table (Current):**
```typescript
// Fix once in NotificationService
async markAsRead(id: string, userId: string) {
  // Fixed logic here
}
```
✅ **Done!** Works for both COMMENT and LIKE

**2 Separate Tables:**
```typescript
// Fix in CommentNotificationService
async markAsRead(id: string, userId: string) {
  // Fixed logic here
}

// Fix AGAIN in LikeNotificationService  
async markAsRead(id: string, userId: string) {
  // Same fixed logic here (duplicated!)
}
```
❌ **Must fix twice!** Easy to miss one, causing bugs

---

## Conclusion

### ✅ **Current Single Table Approach:**
- **NO code repetition**
- **DRY principle** (Don't Repeat Yourself)
- **Single source of truth**
- **Easier maintenance**

### ❌ **2 Separate Tables Would:**
- **Create code repetition**
- **Violate DRY principle**
- **Require duplicate fixes**
- **Increase maintenance burden**

---

## Answer to Your Question

> "but comments and likes same code repeated right if i take 2 tables?"

**YES, you are absolutely correct!** 

If you use 2 separate tables, you **WOULD** have code repetition. That's exactly why the **single table approach is better** - it **AVOIDS** repetition!

The current implementation is the **best practice** - no code duplication! ✅

