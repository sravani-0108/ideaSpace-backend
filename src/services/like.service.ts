import { AppDataSource } from '../config/database';
import { Like } from '../entities/Like';
import { Idea } from '../entities/Idea';
import { IdeaStatus } from '../enums/IdeaStatus';
import { NotificationService } from './notification.service';
import { NotificationType } from '../enums/NotificationType';

export class LikeService {
  private likeRepository = AppDataSource.getRepository(Like);
  private ideaRepository = AppDataSource.getRepository(Idea);
  private notificationService = new NotificationService();

  async likeIdea(ideaId: string, userId: string): Promise<Like> {
    // Check if idea exists and is approved
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PUBLISHED) {
      throw new Error('Likes can only be added to published ideas');
    }

    // Check if user already liked this idea
    const existingLike = await this.likeRepository.findOne({
      where: { ideaId, userId },
    });

    if (existingLike) {
      throw new Error('You have already liked this idea');
    }

    const like = this.likeRepository.create({
      ideaId,
      userId,
    });

    const savedLike = await this.likeRepository.save(like);

    // Create notification for idea creator if liker is not the creator
    if (idea.userId !== userId) {
      this.notificationService
        .createNotification(idea.userId, ideaId, NotificationType.LIKE)
        .catch((error) => {
          // Don't throw - notification failure shouldn't break like action
        });
    }

    return savedLike;
  }

  async unlikeIdea(ideaId: string, userId: string): Promise<void> {
    const like = await this.likeRepository.findOne({
      where: { ideaId, userId },
    });

    if (!like) {
      throw new Error('Like not found');
    }

    await this.likeRepository.remove(like);
  }
}

