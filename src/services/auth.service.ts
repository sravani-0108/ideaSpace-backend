import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { EmailVerification } from '../entities/EmailVerification';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken, JWTPayload } from '../utils/jwt.util';
import { generateOTP, getOTPExpirationTime } from '../utils/otp.util';
import { isValidCompanyEmail } from '../utils/email.util';
import { sendVerificationOTP } from './email.service';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private emailVerificationRepository = AppDataSource.getRepository(EmailVerification);

  async register(email: string, password: string, firstName: string, lastName: string): Promise<User> {
    // Validate company email
    if (!isValidCompanyEmail(email)) {
      throw new Error('Registration is only allowed for company email addresses');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isVerified: false,
    });

    await this.userRepository.save(user);

    // Generate and save OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpirationTime(10);

    const emailVerification = this.emailVerificationRepository.create({
      userId: user.id,
      otp,
      expiresAt,
    });

    await this.emailVerificationRepository.save(emailVerification);

    // Send verification email
    try {
      await sendVerificationOTP(user.email, otp);
    } catch (error: any) {
      // Don't throw error, user can request resend
    }

    return user;
  }

  async verifyEmail(email: string, otp: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['emailVerification'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('Email already verified');
    }

    if (!user.emailVerification) {
      throw new Error('No verification code found. Please request a new one.');
    }

    const verification = user.emailVerification;

    // Check if OTP matches
    if (verification.otp !== otp) {
      throw new Error('Invalid verification code');
    }

    // Check if OTP expired
    if (new Date() > verification.expiresAt) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Mark user as verified
    user.isVerified = true;
    await this.userRepository.save(user);

    // Delete verification record
    await this.emailVerificationRepository.remove(verification);
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword as User,
    };
  }

  async resendOTP(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['emailVerification'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('Email already verified');
    }

    // Delete existing verification if exists
    if (user.emailVerification) {
      await this.emailVerificationRepository.remove(user.emailVerification);
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpirationTime(10);

    const emailVerification = this.emailVerificationRepository.create({
      userId: user.id,
      otp,
      expiresAt,
    });

    await this.emailVerificationRepository.save(emailVerification);

    // Send verification email
    try {
      await sendVerificationOTP(user.email, otp);
    } catch (error: any) {
      throw error; // Re-throw for resend OTP endpoint
    }
  }
}

