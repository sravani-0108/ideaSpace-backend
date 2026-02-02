import { AppDataSource } from '../config/database';
import { Comment } from '../entities/Comment';
import { Idea } from '../entities/Idea';
import { IdeaStatus } from '../enums/IdeaStatus';
import { CreateCommentDto } from '../dto/comment.dto';
import { NotificationService } from './notification.service';
import { NotificationType } from '../enums/NotificationType';
import { PaginationDto } from '../dto/common.dto';

export class CommentService {
  private commentRepository = AppDataSource.getRepository(Comment);
  private ideaRepository = AppDataSource.getRepository(Idea);
  private notificationService = new NotificationService();

  async createComment(
    ideaId: string,
    userId: string,
    createCommentDto: CreateCommentDto
  ): Promise<Comment> {
    // Check if idea exists and is approved
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PUBLISHED) {
      throw new Error('Comments can only be added to published ideas');
    }

    // If this is a reply, validate parent comment exists and belongs to same idea
    let parentComment = null;
    if (createCommentDto.parentId) {
      parentComment = await this.commentRepository.findOne({
        where: { id: createCommentDto.parentId },
        relations: ['user'],
      });

      if (!parentComment) {
        throw new Error('Parent comment not found');
      }

      if (parentComment.ideaId !== ideaId) {
        throw new Error('Parent comment does not belong to this idea');
      }
    }

    const comment = this.commentRepository.create({
      ideaId,
      userId,
      content: createCommentDto.content,
      ...(createCommentDto.parentId && { parentId: createCommentDto.parentId }),
    });

    const savedComment = await this.commentRepository.save(comment);

    // Create notification for idea creator if commenter is not the creator
    if (idea.userId !== userId) {
      this.notificationService
        .createNotification(idea.userId, ideaId, NotificationType.COMMENT)
        .catch((error) => {
          // Failed to create comment notification
        });
    }

    // If this is a reply, notify the parent comment author (if different from idea creator and current user)
    if (parentComment && parentComment.userId !== userId && parentComment.userId !== idea.userId) {
      this.notificationService
        .createNotification(parentComment.userId, ideaId, NotificationType.COMMENT)
        .catch((error) => {
          // Failed to create reply notification
        });
    }

    return savedComment;
  }

  async getCommentsByUserId(userId: string, pagination: PaginationDto): Promise<{
    comments: (Comment & { idea?: Idea })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [comments, total] = await this.commentRepository.findAndCount({
      where: { userId },
      relations: ['user', 'idea'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Only include comments on published ideas, clean user data
    const cleanedComments = comments
      .filter((comment) => comment.idea && comment.idea.status === IdeaStatus.PUBLISHED)
      .map((comment) => {
        let userWithoutPassword = comment.user;
        if (comment.user && 'password' in comment.user) {
          const { password, ...rest } = comment.user as any;
          userWithoutPassword = rest;
        }
        
        // Format profile picture URL if exists
        if (userWithoutPassword && (userWithoutPassword as any).profilePicture) {
          const profilePic = (userWithoutPassword as any).profilePicture;
          if (!profilePic.startsWith('/api/')) {
            (userWithoutPassword as any).profilePicture = `/api/uploads/profile-pictures/${profilePic}`;
          }
        }

        // Clean idea data (remove password from idea.user if exists)
        let ideaData = comment.idea;
        if (ideaData && ideaData.user && 'password' in ideaData.user) {
          const { password, ...rest } = ideaData.user as any;
          ideaData = { ...ideaData, user: rest };
        }

        return {
          ...comment,
          user: userWithoutPassword,
          idea: ideaData,
        };
      });

    return {
      comments: cleanedComments as any,
      total: cleanedComments.length,
      page,
      limit,
      totalPages: Math.ceil(cleanedComments.length / limit),
    };
  }
}

