import { Response } from 'express';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/comment.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse, PaginationDto } from '../dto/common.dto';
import { AppDataSource } from '../config/database';
import { Comment } from '../entities/Comment';

const commentService = new CommentService();

export class CommentController {
  async createComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { ideaId } = req.params;
      const createCommentDto: CreateCommentDto = req.body;
      const comment = await commentService.createComment(
        ideaId,
        req.userId!,
        createCommentDto
      );

      // Fetch comment with user and parent relations
      const commentRepository = AppDataSource.getRepository(Comment);
      const commentWithRelations = await commentRepository.findOne({
        where: { id: comment.id },
        relations: ['user', 'parent', 'parent.user'],
      });

      // Helper function to clean user (remove password and format profile picture URL)
      const cleanUser = (user: any): any => {
        if (!user) return user;
        let userWithoutPassword = user;
        if ('password' in user) {
          const { password, ...rest } = user;
          userWithoutPassword = rest;
        }
        // Format profile picture URL if exists
        if (userWithoutPassword.profilePicture && !userWithoutPassword.profilePicture.startsWith('/api/')) {
          userWithoutPassword.profilePicture = `/api/uploads/profile-pictures/${userWithoutPassword.profilePicture}`;
        }
        return userWithoutPassword;
      };

      // Remove password from user and format profile picture URL
      if (commentWithRelations && commentWithRelations.user) {
        commentWithRelations.user = cleanUser(commentWithRelations.user);
      }

      // Remove password from parent comment user if exists
      if (commentWithRelations?.parent?.user) {
        commentWithRelations.parent.user = cleanUser(commentWithRelations.parent.user);
      }

      const response: ApiResponse<any> = {
        success: true,
        data: commentWithRelations,
        message: createCommentDto.parentId 
          ? 'Reply added successfully' 
          : 'Comment added successfully',
      };

      res.status(201).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to create comment',
      };
      res.status(400).json(response);
    }
  }

  async getCommentsByUserId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const pagination: PaginationDto = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await commentService.getCommentsByUserId(userId, pagination);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          comments: result.comments,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        message: error.message || 'Failed to fetch user comments',
      };
      res.status(400).json(response);
    }
  }
}

