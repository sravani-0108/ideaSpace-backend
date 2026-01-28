import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'path';
import { sendVerificationOTP } from '../services/email.service';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
if (!process.env.SMTP_USER) {
  dotenv.config();
}

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'undefined');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || process.env.SMTP_USER);
    console.log('');

    const testEmail = process.env.SMTP_USER || 'test@ibaseit.com';
    const testOTP = '123456';

    console.log(`Sending test email to: ${testEmail}`);
    await sendVerificationOTP(testEmail, testOTP);
    console.log('✅ Email sent successfully!');
    console.log(`Check ${testEmail} inbox for OTP: ${testOTP}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Email test failed:', error.message);
    console.error('');
    console.error('Common issues:');
    console.error('1. SMTP_PASS might be incorrect (use App Password for Office 365)');
    console.error('2. SMTP_USER might not have SMTP enabled');
    console.error('3. Office 365 might require App Password instead of regular password');
    console.error('');
    console.error('See docs/EMAIL_SETUP.md for detailed instructions');
    process.exit(1);
  }
}

testEmail();

