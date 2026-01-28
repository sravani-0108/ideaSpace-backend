import { AppDataSource } from '../config/database';
import { SavedIdea } from '../entities/SavedIdea';
import { Idea } from '../entities/Idea';
import { IdeaStatus } from '../enums/IdeaStatus';

export class SavedIdeaService {
  private savedIdeaRepository = AppDataSource.getRepository(SavedIdea);
  private ideaRepository = AppDataSource.getRepository(Idea);

  async saveIdea(ideaId: string, userId: string): Promise<SavedIdea> {
    // Check if idea exists and is published
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PUBLISHED) {
      throw new Error('Only published ideas can be saved');
    }

    // Check if already saved
    const existingSave = await this.savedIdeaRepository.findOne({
      where: { ideaId, userId },
    });

    if (existingSave) {
      throw new Error('Idea is already saved');
    }

    const savedIdea = this.savedIdeaRepository.create({
      ideaId,
      userId,
    });

    return await this.savedIdeaRepository.save(savedIdea);
  }

  async unsaveIdea(ideaId: string, userId: string): Promise<void> {
    const savedIdea = await this.savedIdeaRepository.findOne({
      where: { ideaId, userId },
    });

    if (!savedIdea) {
      throw new Error('Idea is not saved');
    }

    await this.savedIdeaRepository.remove(savedIdea);
  }

  async getSavedIdeas(userId: string): Promise<(Idea & { likesCount: number; commentsCount: number })[]> {
    // Get saved ideas with relations
    const savedIdeas = await this.savedIdeaRepository.find({
      where: { userId },
      relations: ['idea', 'idea.user'],
      order: { createdAt: 'DESC' },
    });

    if (savedIdeas.length === 0) {
      return [];
    }

    // Extract idea IDs
    const ideaIds = savedIdeas.map((saved) => saved.idea.id);

    // Get all ideas with counts in a single query
    const ideasWithCounts = await this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoin('idea.user', 'user')
      .leftJoin('idea.likes', 'like')
      .leftJoin('idea.comments', 'comment')
      .where('idea.id IN (:...ids)', { ids: ideaIds })
      .select([
        'idea.id',
        'idea.userId',
        'idea.title',
        'idea.description',
        'idea.status',
        'idea.createdAt',
        'idea.updatedAt',
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
      ])
      .addSelect('COUNT(DISTINCT like.id)', 'likesCount')
      .addSelect('COUNT(DISTINCT comment.id)', 'commentsCount')
      .groupBy('idea.id')
      .addGroupBy('user.id')
      .getRawMany();

    // Transform and map back to original order
    const ideasMap = new Map(
      ideasWithCounts.map((raw: any) => {
        const idea: any = {
          id: raw.idea_id,
          userId: raw.idea_userId,
          title: raw.idea_title,
          description: raw.idea_description,
          status: raw.idea_status,
          createdAt: raw.idea_createdAt,
          updatedAt: raw.idea_updatedAt,
          user: {
            id: raw.user_id,
            email: raw.user_email,
            firstName: raw.user_firstName,
            lastName: raw.user_lastName,
          },
          likesCount: parseInt(raw.likesCount) || 0,
          commentsCount: parseInt(raw.commentsCount) || 0,
        };
        return [idea.id, idea];
      })
    );

    // Return in the order they were saved (most recent first)
    return savedIdeas
      .map((saved) => ideasMap.get(saved.idea.id))
      .filter((idea) => idea !== undefined) as (Idea & { likesCount: number; commentsCount: number })[];
  }

  async isIdeaSaved(ideaId: string, userId: string): Promise<boolean> {
    const savedIdea = await this.savedIdeaRepository.findOne({
      where: { ideaId, userId },
    });

    return !!savedIdea;
  }
}

