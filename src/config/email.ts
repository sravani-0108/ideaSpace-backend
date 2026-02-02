import nodemailer from 'nodemailer';


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
emailTransporter.verify(() => {
  // Email connection verified
});

export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@ibaseit.com';

