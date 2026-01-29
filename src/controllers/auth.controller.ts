import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ResendOTPDto } from '../dto/auth.dto';
import { ApiResponse } from '../dto/common.dto';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const registerDto: RegisterDto = req.body;
      const user = await authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.firstName,
        registerDto.lastName
      );

      const response: ApiResponse<{ userId: string }> = {
        success: true,
        message: 'Registration successful. Please check your email for verification code.',
        data: {
          userId: user.id,
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Registration failed',
      };
      res.status(400).json(response);
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const verifyEmailDto: VerifyEmailDto = req.body;
      await authService.verifyEmail(verifyEmailDto.email, verifyEmailDto.otp);

      const response: ApiResponse<null> = {
        success: true,
        message: 'Email verified successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Email verification failed',
      };
      res.status(400).json(response);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginDto: LoginDto = req.body;
      const result = await authService.login(loginDto.email, loginDto.password);

      // Format profile picture path if exists
      const profilePicture = result.user.profilePicture 
        ? (result.user.profilePicture.startsWith('/api/') 
            ? result.user.profilePicture 
            : `/api/uploads/profile-pictures/${result.user.profilePicture}`)
        : null;

      const response: ApiResponse<{
        token: string;
        user: { 
          id: string; 
          email: string; 
          firstName: string; 
          lastName: string; 
          role: string;
          profilePicture: string | null;
          isEmailVerified: boolean;
        };
      }> = {
        success: true,
        data: {
          token: result.token,
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            profilePicture: profilePicture,
            isEmailVerified: result.user.isVerified,
          },
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('verify') ? 403 : 401;
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Login failed',
      };
      res.status(statusCode).json(response);
    }
  }

  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const resendOTPDto: ResendOTPDto = req.body;
      await authService.resendOTP(resendOTPDto.email);

      const response: ApiResponse<null> = {
        success: true,
        message: 'OTP resent successfully',
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to resend OTP',
      };
      res.status(400).json(response);
    }
  }
}

