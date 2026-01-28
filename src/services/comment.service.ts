import { AppDataSource } from '../config/database';
import { Comment } from '../entities/Comment';
import { Idea } from '../entities/Idea';
import { IdeaStatus } from '../enums/IdeaStatus';
import { CreateCommentDto } from '../dto/comment.dto';
import { NotificationService } from './notification.service';
import { NotificationType } from '../enums/NotificationType';

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
          console.error('Failed to create comment notification:', error);
        });
    }

    // If this is a reply, notify the parent comment author (if different from idea creator and current user)
    if (parentComment && parentComment.userId !== userId && parentComment.userId !== idea.userId) {
      this.notificationService
        .createNotification(parentComment.userId, ideaId, NotificationType.COMMENT)
        .catch((error) => {
          console.error('Failed to create reply notification:', error);
        });
    }

    return savedComment;
  }
}

