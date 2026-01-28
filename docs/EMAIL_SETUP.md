# Email Setup Guide - Office 365

## Current Error

If you're getting this error:
```
535 5.7.139 Authentication unsuccessful
```

This means Office 365 SMTP authentication is failing.

## Solution: Use App Password

Office 365 requires an **App Password** instead of your regular password when:
- Multi-Factor Authentication (MFA) is enabled
- Modern Authentication is enabled

### Steps to Create App Password for Office 365:

#### Option 1: Microsoft 365 Admin Center (Recommended)

1. **Sign in to Microsoft 365 Admin Center:**
   - Go to: https://admin.microsoft.com
   - Sign in with admin account

2. **Navigate to User Settings:**
   - Go to "Users" → "Active users"
   - Find and click on `noreply@ibaseit.com`

3. **Enable App Passwords:**
   - Click "Mail" tab
   - Under "App passwords", click "Create app password"
   - Copy the generated password (16 characters)

#### Option 2: Security Info Page

1. **Go to Security Info:**
   - Visit: https://mysignins.microsoft.com/security-info
   - Sign in with `noreply@ibaseit.com`

2. **Create App Password:**
   - Click "App passwords"
   - Click "Create"
   - Give it a name: "IdeaSpace Backend"
   - Copy the generated password

#### Option 3: If App Passwords Not Available

If you don't see "App passwords" option:

1. **Disable MFA temporarily** (for testing):
   - Go to Microsoft 365 Admin Center
   - Users → Active users → Select user
   - Manage multi-factor authentication
   - Disable MFA for this account

2. **Use regular password** in `.env`

3. **Re-enable MFA** after testing

### Update .env File:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@ibaseit.com
SMTP_PASS=your_app_password_here  # ← Use App Password (16 chars, no spaces)
EMAIL_FROM=noreply@ibaseit.com
```

### Test Email Configuration:

After updating `.env`, test the email:

```bash
npm run test:email
```

This will send a test email to verify SMTP is working.

### Restart the Server:

```bash
npm run dev
```

## Alternative: Disable MFA (Not Recommended)

If you can't use App Password, you can disable MFA, but this is **less secure**:

1. Go to Microsoft 365 Admin Center
2. Disable MFA for the account
3. Use regular password in `.env`

**⚠️ Warning:** This reduces security. App Password is the recommended approach.

## Testing Email Configuration

After updating `.env`, test the email:

```bash
# The registration will try to send email
# Check server logs for email sending status
```

## Office 365 SMTP Settings

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your_email@ibaseit.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@ibaseit.com
```

## Troubleshooting

### Error: "Authentication unsuccessful"
- ✅ Use App Password (not regular password)
- ✅ Verify SMTP_USER is correct email
- ✅ Check if account has SMTP enabled

### Error: "Connection timeout"
- ✅ Check firewall allows port 587
- ✅ Verify SMTP_HOST is correct
- ✅ Try port 465 with `secure: true`

### Email not sending but no error
- ✅ Check spam folder
- ✅ Verify EMAIL_FROM matches SMTP_USER domain
- ✅ Check server logs for detailed errors

## Current Configuration

Your `.env` should have:
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@ibaseit.com
SMTP_PASS=your_app_password_here  # ← Must be App Password!
EMAIL_FROM=noreply@ibaseit.com
```

## Note

Even if email sending fails, **registration still works**. The user is created and OTP is generated. They can use the "Resend OTP" feature once email is configured correctly.

