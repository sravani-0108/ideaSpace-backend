import { emailTransporter } from '../config/email';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    console.log('📧 Attempting to send email...');
    console.log('From:', process.env.SMTP_USER || process.env.EMAIL_FROM);
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    
    const result = await emailTransporter.sendMail({
      from: process.env.SMTP_USER || process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error: any) {
    console.error('❌ Error sending email:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    if (error.responseCode) {
      console.error('Response Code:', error.responseCode);
    }
    if (error.command) {
      console.error('Failed Command:', error.command);
    }
    console.error('');
    console.error('Troubleshooting steps:');
    console.error('1. Verify SMTP_USER and SMTP_PASS in .env');
    console.error('2. For Office 365, ensure you are using App Password');
    console.error('3. Check if account has SMTP access enabled');
    console.error('4. Verify firewall allows port 587');
    throw new Error('Failed to send email');
  }
};

export const sendVerificationOTP = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Thank you for registering with IdeaSpace!</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't register for this account, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - IdeaSpace',
    html,
  });
};

