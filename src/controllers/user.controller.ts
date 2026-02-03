import { Response } from 'express';
import { UserService } from '../services/user.service';
import { UpdateProfileDto } from '../dto/user.dto';
import { ApiResponse } from '../dto/common.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { User } from '../entities/User';
import path from 'path';

const userService = new UserService();

export class UserController {
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const user = await userService.getProfile(userId);

      const response: ApiResponse<User> = {
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to retrieve profile',
      };
      res.status(404).json(response);
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const updateDto: UpdateProfileDto = req.body;
      
      // Check if file was uploaded
      let profilePicturePath: string | undefined;
      if ((req as any).file) {
        profilePicturePath = (req as any).file.path;
      }
      
      const user = await userService.updateProfile(userId, updateDto, profilePicturePath);

      const response: ApiResponse<User> = {
        success: true,
        message: 'Profile updated successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to update profile',
      };
      res.status(400).json(response);
    }
  }

  async uploadProfilePicture(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      
      if (!(req as any).file) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'No file uploaded',
        };
        res.status(400).json(response);
        return;
      }

      const profilePicturePath = (req as any).file.path;
      const user = await userService.updateProfile(userId, {}, profilePicturePath);

      const response: ApiResponse<User> = {
        success: true,
        message: 'Profile picture uploaded successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to upload profile picture',
      };
      res.status(400).json(response);
    }
  }

  async getUserById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      const response: ApiResponse<User> = {
        success: true,
        message: 'User retrieved successfully',
        data: user,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to retrieve user',
      };
      res.status(404).json(response);
    }
  }

  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Only admins can get list of users
      if (req.user?.role !== 'ADMIN') {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Unauthorized',
        };
        res.status(403).json(response);
        return;
      }

      const users = await userService.getAllUsers();

      const response: ApiResponse<any> = {
        success: true,
        data: users,
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to retrieve users',
      };
      res.status(400).json(response);
    }
  }

  async getAllJudges(req: AuthRequest, res: Response): Promise<void> {
    // Keep for backward compatibility, but now returns all users
    return this.getAllUsers(req, res);
  }
}

