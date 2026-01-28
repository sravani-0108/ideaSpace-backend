import { Response } from 'express';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto } from '../dto/comment.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiResponse } from '../dto/common.dto';
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

      // Remove password from user
      if (commentWithRelations && commentWithRelations.user && 'password' in commentWithRelations.user) {
        const { password, ...userWithoutPassword } = commentWithRelations.user as any;
        commentWithRelations.user = userWithoutPassword as any;
      }

      // Remove password from parent comment user if exists
      if (commentWithRelations?.parent?.user && 'password' in commentWithRelations.parent.user) {
        const { password, ...userWithoutPassword } = commentWithRelations.parent.user as any;
        commentWithRelations.parent.user = userWithoutPassword as any;
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
}

