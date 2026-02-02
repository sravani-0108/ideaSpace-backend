import { emailTransporter } from '../config/email';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_USER || process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error: any) {
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

