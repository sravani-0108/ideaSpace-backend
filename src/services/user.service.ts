import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UpdateProfileDto } from '../dto/user.dto';
import path from 'path';
import fs from 'fs';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async updateProfile(userId: string, updateData: UpdateProfileDto, profilePicturePath?: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update fields if provided
    if (updateData.firstName !== undefined) {
      user.firstName = updateData.firstName.trim();
    }

    if (updateData.lastName !== undefined) {
      user.lastName = updateData.lastName.trim();
    }

    // Update profile picture if provided
    if (profilePicturePath) {
      // Delete old profile picture if exists
      if (user.profilePicture) {
        // Extract filename from stored path (could be full path or just filename)
        const oldFilename = path.basename(user.profilePicture);
        const oldPicturePath = path.join(__dirname, '../../uploads/profile-pictures', oldFilename);
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
        }
      }
      // Store only the filename, not the full path
      const filename = path.basename(profilePicturePath);
      user.profilePicture = filename;
    }

    await this.userRepository.save(user);

    // Return user without password, mapping isVerified to isEmailVerified for frontend compatibility
    const { password, isVerified, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      isEmailVerified: isVerified,
      profilePicture: user.profilePicture ? `/api/uploads/profile-pictures/${user.profilePicture}` : null,
    };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isVerified', 'profilePicture', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Map isVerified to isEmailVerified for frontend compatibility
    return {
      ...user,
      isEmailVerified: user.isVerified,
      profilePicture: user.profilePicture ? `/api/uploads/profile-pictures/${user.profilePicture}` : null,
    };
  }

  async getUserById(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isVerified', 'profilePicture', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Map isVerified to isEmailVerified for frontend compatibility
    return {
      ...user,
      isEmailVerified: user.isVerified,
      profilePicture: user.profilePicture ? `/api/uploads/profile-pictures/${user.profilePicture}` : null,
    };
  }
}

