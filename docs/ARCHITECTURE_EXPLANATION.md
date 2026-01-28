# Controller vs Service - Architecture Explanation

## Overview

This project follows a **layered architecture** pattern that separates concerns:

```
HTTP Request → Controller → Service → Database
                ↓           ↓
            HTTP Logic   Business Logic
```

---

## 🎯 **Controller** (HTTP Layer)

### Purpose
- **Handles HTTP requests and responses**
- **Acts as a bridge between the client and business logic**
- **Manages HTTP-specific concerns**

### Responsibilities:
1. ✅ Receive HTTP requests (`req: Request`)
2. ✅ Extract data from request body/params/query
3. ✅ Call appropriate service method
4. ✅ Format HTTP responses (`res: Response`)
5. ✅ Handle HTTP status codes (200, 201, 400, 404, etc.)
6. ✅ Handle errors and return proper error responses

### What Controllers DO:
```typescript
// Controller Example
export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      // 1. Extract data from HTTP request
      const registerDto: RegisterDto = req.body;
      
      // 2. Call service (business logic)
      const user = await authService.register(registerDto.email, registerDto.password);
      
      // 3. Format HTTP response
      const response: ApiResponse<{ userId: string }> = {
        success: true,
        message: 'Registration successful...',
        data: { userId: user.id },
      };
      
      // 4. Send HTTP response with status code
      res.status(201).json(response);
    } catch (error: any) {
      // 5. Handle errors and return HTTP error response
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
```

### Key Points:
- ❌ **Does NOT** contain business logic
- ❌ **Does NOT** directly access database
- ✅ **Only** handles HTTP communication
- ✅ **Only** formats responses

---

## 🧠 **Service** (Business Logic Layer)

### Purpose
- **Contains business logic and rules**
- **Handles data processing and validation**
- **Interacts with database/repositories**

### Responsibilities:
1. ✅ Implement business rules and logic
2. ✅ Validate data (business-level validation)
3. ✅ Interact with database (via repositories)
4. ✅ Process and transform data
5. ✅ Handle business errors
6. ✅ Return domain objects (not HTTP responses)

### What Services DO:
```typescript
// Service Example
export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  
  async register(email: string, password: string): Promise<User> {
    // 1. Business validation
    if (!isValidCompanyEmail(email)) {
      throw new Error('Registration is only allowed for company email addresses');
    }
    
    // 2. Check business rules
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // 3. Process data (hash password)
    const hashedPassword = await hashPassword(password);
    
    // 4. Create and save to database
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
    });
    
    await this.userRepository.save(user);
    
    // 5. Additional business logic (generate OTP, send email)
    const otp = generateOTP();
    // ... more business logic
    
    // 6. Return domain object (not HTTP response)
    return user;
  }
}
```

### Key Points:
- ❌ **Does NOT** know about HTTP (no `req`, `res`)
- ❌ **Does NOT** format HTTP responses
- ✅ **Only** contains business logic
- ✅ **Only** returns data objects

---

## 📊 **Side-by-Side Comparison**

| Aspect | Controller | Service |
|--------|-----------|---------|
| **Layer** | HTTP/API Layer | Business Logic Layer |
| **Dependencies** | Express (`Request`, `Response`) | Database, Utilities, Other Services |
| **Input** | HTTP Request (`req.body`, `req.params`) | Plain data (strings, objects) |
| **Output** | HTTP Response (`res.json()`, status codes) | Domain objects (User, Idea, etc.) |
| **Responsibilities** | HTTP handling, response formatting | Business rules, data processing |
| **Error Handling** | HTTP error responses (400, 404, 500) | Business exceptions (throw Error) |
| **Reusability** | Tied to HTTP (not reusable) | Reusable (can be called from anywhere) |
| **Testing** | Test HTTP requests/responses | Test business logic independently |

---

## 🔄 **Flow Example: User Registration**

### Step-by-Step Flow:

```
1. HTTP Request arrives
   POST /api/auth/register
   Body: { email: "user@company.com", password: "pass123" }
   ↓
2. Route → AuthController.register()
   ↓
3. Controller extracts data from req.body
   ↓
4. Controller calls AuthService.register(email, password)
   ↓
5. Service validates email (business rule)
   ↓
6. Service checks if user exists (database query)
   ↓
7. Service hashes password (business logic)
   ↓
8. Service creates user in database
   ↓
9. Service generates OTP (business logic)
   ↓
10. Service sends email (external service)
   ↓
11. Service returns User object
   ↓
12. Controller formats HTTP response
   ↓
13. Controller sends HTTP response
   res.status(201).json({ success: true, data: {...} })
```

---

## 💡 **Why Separate Them?**

### Benefits:

1. **Separation of Concerns**
   - Controllers handle HTTP
   - Services handle business logic
   - Easy to understand and maintain

2. **Reusability**
   - Services can be reused (CLI, background jobs, other APIs)
   - Controllers are HTTP-specific

3. **Testability**
   - Test services without HTTP (unit tests)
   - Test controllers with HTTP mocks (integration tests)

4. **Flexibility**
   - Change HTTP layer without changing business logic
   - Change business logic without changing HTTP layer

5. **Maintainability**
   - Clear responsibilities
   - Easier to debug
   - Easier to modify

---

## 📝 **Example: What Happens If...**

### Scenario: Add a CLI command to register users

**With Separation (Current Architecture):**
```typescript
// CLI Script
import { AuthService } from './services/auth.service';

const authService = new AuthService();
const user = await authService.register('user@company.com', 'pass123');
// ✅ Works! Service is reusable
```

**Without Separation (Bad Architecture):**
```typescript
// Would need to create HTTP request/response objects
// ❌ Can't reuse controller logic easily
```

---

## 🎓 **Summary**

| | Controller | Service |
|---|---|---|
| **Think of it as** | "The waiter" (takes order, serves food) | "The chef" (cooks the food) |
| **Handles** | HTTP communication | Business logic |
| **Knows about** | Express, HTTP, status codes | Database, business rules |
| **Returns** | HTTP responses | Data objects |
| **Can be used by** | HTTP clients only | Any code (HTTP, CLI, jobs) |

---

## ✅ **Best Practices**

### Controller Should:
- ✅ Extract data from `req`
- ✅ Call service methods
- ✅ Format responses
- ✅ Handle HTTP errors

### Controller Should NOT:
- ❌ Contain business logic
- ❌ Access database directly
- ❌ Process data
- ❌ Make business decisions

### Service Should:
- ✅ Contain business logic
- ✅ Validate business rules
- ✅ Access database
- ✅ Process and transform data

### Service Should NOT:
- ❌ Know about HTTP
- ❌ Format HTTP responses
- ❌ Use `req` or `res`
- ❌ Return HTTP status codes

---

This architecture makes the codebase **clean, maintainable, and scalable**! 🚀

