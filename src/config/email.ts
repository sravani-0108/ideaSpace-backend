import nodemailer from 'nodemailer';

// Log email configuration (without password)
console.log('=== Email Configuration ===');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.office365.com');
console.log('SMTP_PORT:', process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'undefined');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@ibaseit.com');
console.log('==========================');

// Office 365 SMTP Configuration
export const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false, // Use TLS (not SSL)
  requireTLS: true, // Office 365 requires TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Office 365 TLS configuration
    rejectUnauthorized: false,
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  logger: process.env.NODE_ENV === 'development', // Enable logging in development
});

// Verify connection on startup (non-blocking)
emailTransporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
    const smtpError = error as any;
    console.error('Error code:', smtpError.code || 'N/A');
    console.error('Error command:', smtpError.command || 'N/A');
    console.error('Response:', smtpError.response || 'N/A');
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check SMTP_USER and SMTP_PASS in .env file');
    console.error('2. For Office 365, use App Password (not regular password)');
    console.error('3. Verify account has SMTP enabled');
    console.error('4. Check if MFA is enabled (requires App Password)');
    console.error('5. See docs/EMAIL_SETUP.md for detailed instructions');
  } else {
    console.log('✅ Email server connection verified successfully');
  }
});

export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@ibaseit.com';

