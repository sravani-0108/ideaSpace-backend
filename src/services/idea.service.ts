import { AppDataSource } from '../config/database';
import { Idea } from '../entities/Idea';
import { Comment } from '../entities/Comment';
import { IdeaStatus } from '../enums/IdeaStatus';
import { UserRole } from '../enums/UserRole';
import { CreateIdeaDto } from '../dto/idea.dto';
import { PaginationDto } from '../dto/common.dto';

export class IdeaService {
  private ideaRepository = AppDataSource.getRepository(Idea);

  async createIdea(userId: string, createIdeaDto: CreateIdeaDto, userRole?: UserRole): Promise<Idea> {
    // Admin ideas are automatically approved and published, regular users go to PENDING
    const status = userRole === UserRole.ADMIN ? IdeaStatus.PUBLISHED : IdeaStatus.PENDING;
    
    const ideaData: Partial<Idea> = {
      userId,
      title: createIdeaDto.title,
      description: createIdeaDto.description,
      status,
    };

    // If admin creates idea, set approvedBy to admin's ID
    if (userRole === UserRole.ADMIN) {
      ideaData.approvedBy = userId;
    }

    const idea = this.ideaRepository.create(ideaData);
    return await this.ideaRepository.save(idea);
  }

  /**
   * Get published ideas feed with aggregated counts
   * Uses database aggregation for better performance
   */
  async getFeed(pagination: PaginationDto): Promise<{
    ideas: (Idea & { likesCount: number; commentsCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Use query builder for efficient aggregation
    const queryBuilder = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoin('idea.user', 'user')
      .leftJoin('idea.likes', 'like')
      .leftJoin('idea.comments', 'comment')
      .where('idea.status = :status', { status: IdeaStatus.PUBLISHED })
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
        'user.profilePicture',
      ])
      .addSelect('COUNT(DISTINCT like.id)', 'likesCount')
      .addSelect('COUNT(DISTINCT comment.id)', 'commentsCount')
      .groupBy('idea.id')
      .addGroupBy('user.id')
      .orderBy('idea.createdAt', 'DESC')
      .offset(skip)
      .limit(limit);

    const [rawIdeas, total] = await Promise.all([
      queryBuilder.getRawMany(),
      this.ideaRepository.count({
        where: { status: IdeaStatus.PUBLISHED },
      }),
    ]);

    // Transform raw results to match expected format
    const ideasWithCounts = rawIdeas.map((raw: any) => {
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
          profilePicture: raw.user_profilePicture 
            ? (raw.user_profilePicture.startsWith('/api/') 
                ? raw.user_profilePicture 
                : `/api/uploads/profile-pictures/${raw.user_profilePicture}`)
            : null,
        },
        likesCount: parseInt(raw.likesCount) || 0,
        commentsCount: parseInt(raw.commentsCount) || 0,
      };
      return idea;
    });

    return {
      ideas: ideasWithCounts as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   * Returns approved ideas (not published)
   */
  async getApprovedIdeas(pagination: PaginationDto): Promise<{
    ideas: (Idea & { likesCount: number; commentsCount: number })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [ideas, total] = await this.ideaRepository.findAndCount({
      where: { status: IdeaStatus.APPROVED },
      relations: ['user', 'likes', 'comments'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Remove password from user objects, format profile picture URLs, and add counts
    const ideasWithCounts = ideas.map((idea) => {
      let userWithoutPassword = idea.user;
      if (idea.user && 'password' in idea.user) {
        const { password, ...rest } = idea.user as any;
        userWithoutPassword = rest;
      }
      // Format profile picture URL if exists
      if (userWithoutPassword && (userWithoutPassword as any).profilePicture) {
        const profilePic = (userWithoutPassword as any).profilePicture;
        if (!profilePic.startsWith('/api/')) {
          (userWithoutPassword as any).profilePicture = `/api/uploads/profile-pictures/${profilePic}`;
        }
      }
      return {
        ...idea,
        user: userWithoutPassword,
        likesCount: idea.likes?.length || 0,
        commentsCount: idea.comments?.length || 0,
      };
    });

    return {
      ideas: ideasWithCounts as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIdeaById(id: string, userId?: string): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: [
        'user',
        'likes',
        'likes.user',
      ],
    });

    if (!idea) {
      throw new Error('Idea not found');
    }

    // Only return published ideas to regular users
    // But allow users to see their own PENDING/APPROVED ideas
    if (idea.status !== IdeaStatus.PUBLISHED) {
      // If user is not the owner, don't show non-published ideas
      if (!userId || idea.userId !== userId) {
        throw new Error('Idea not found');
      }
    }

    // Remove passwords from user objects and format profile picture URLs
    if (idea.user && 'password' in idea.user) {
      const { password, ...userWithoutPassword } = idea.user as any;
      // Format profile picture URL if exists
      if (userWithoutPassword.profilePicture && !userWithoutPassword.profilePicture.startsWith('/api/')) {
        userWithoutPassword.profilePicture = `/api/uploads/profile-pictures/${userWithoutPassword.profilePicture}`;
      }
      idea.user = userWithoutPassword as any;
    }

    // Load all comments for this idea with user relations
    const commentRepository = AppDataSource.getRepository(Comment);
    const allComments = await commentRepository.find({
      where: { ideaId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    // Helper function to remove password from user and format profile picture URL
    const cleanUser = (user: any): any => {
      if (!user) return user;
      
      let userWithoutPassword = user;
      if ('password' in user) {
        const { password, ...rest } = user;
        userWithoutPassword = rest;
      }
      
      // Format profile picture URL if exists
      if (userWithoutPassword.profilePicture) {
        if (!userWithoutPassword.profilePicture.startsWith('/api/')) {
          userWithoutPassword.profilePicture = `/api/uploads/profile-pictures/${userWithoutPassword.profilePicture}`;
        }
      }
      
      return userWithoutPassword;
    };

    // Build comment tree structure recursively
    const buildCommentTree = (parentId: string | null): any[] => {
      return allComments
        .filter((comment: any) => comment.parentId === parentId)
        .map((comment: any) => {
          const cleanedComment: any = {
            ...comment,
            user: cleanUser(comment.user),
            replies: buildCommentTree(comment.id), // Recursively build nested replies
          };
          return cleanedComment;
        })
        .sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    };

    // Structure comments with nested replies
    if (allComments.length > 0) {
      // Get top-level comments (no parent) and build tree
      idea.comments = buildCommentTree(null)
        .sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } else {
      idea.comments = [];
    }

    if (idea.likes) {
      idea.likes = idea.likes.map((like: any) => {
        if (like.user && 'password' in like.user) {
          const { password, ...userWithoutPassword } = like.user;
          return { ...like, user: userWithoutPassword };
        }
        return like;
      });
    }

    return idea;
  }

  async getIdeasForReview(pagination: PaginationDto): Promise<{
    ideas: Idea[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [ideas, total] = await this.ideaRepository.findAndCount({
      where: { status: IdeaStatus.PENDING },
      relations: ['user', 'approvedByUser'],
      order: { createdAt: 'ASC' },
      skip,
      take: limit,
    });

    // Remove password from user objects and format profile picture URLs
    const ideasWithoutPassword = ideas.map((idea) => {
      if (idea.user && 'password' in idea.user) {
        const { password, ...userWithoutPassword } = idea.user as any;
        // Format profile picture URL if exists
        if (userWithoutPassword.profilePicture && !userWithoutPassword.profilePicture.startsWith('/api/')) {
          userWithoutPassword.profilePicture = `/api/uploads/profile-pictures/${userWithoutPassword.profilePicture}`;
        }
        idea.user = userWithoutPassword as any;
      }
      // Remove password from approvedByUser if exists
      if (idea.approvedByUser && 'password' in idea.approvedByUser) {
        const { password, ...adminWithoutPassword } = idea.approvedByUser as any;
        // Format profile picture URL if exists
        if (adminWithoutPassword.profilePicture && !adminWithoutPassword.profilePicture.startsWith('/api/')) {
          adminWithoutPassword.profilePicture = `/api/uploads/profile-pictures/${adminWithoutPassword.profilePicture}`;
        }
        idea.approvedByUser = adminWithoutPassword as any;
      }
      return idea;
    });

    return {
      ideas: ideasWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveIdea(id: string, adminId: string): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({ where: { id } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PENDING) {
      throw new Error('Idea is not in PENDING status');
    }

    idea.status = IdeaStatus.APPROVED;
    idea.approvedBy = adminId;
    const savedIdea = await this.ideaRepository.save(idea);

    // Send notification to idea creator
    try {
      const { NotificationService } = await import('./notification.service');
      const notificationService = new NotificationService();
      await notificationService.createNotification(
        idea.userId,
        idea.id,
        (await import('../enums/NotificationType')).NotificationType.IDEA_APPROVED
      );
    } catch (error) {
      // Don't fail if notification creation fails
      console.error('Failed to create approval notification:', error);
    }

    return savedIdea;
  }

  async publishIdea(id: string): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({ where: { id } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.APPROVED) {
      throw new Error('Idea must be APPROVED before publishing');
    }

    idea.status = IdeaStatus.PUBLISHED;
    return await this.ideaRepository.save(idea);
  }

  async rejectIdea(id: string): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({ where: { id } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PENDING) {
      throw new Error('Idea is not in PENDING status');
    }

    idea.status = IdeaStatus.REJECTED;
    const savedIdea = await this.ideaRepository.save(idea);

    // Send notification to idea creator
    try {
      const { NotificationService } = await import('./notification.service');
      const notificationService = new NotificationService();
      await notificationService.createNotification(
        idea.userId,
        idea.id,
        (await import('../enums/NotificationType')).NotificationType.IDEA_REJECTED
      );
    } catch (error) {
      // Don't fail if notification creation fails
      console.error('Failed to create rejection notification:', error);
    }

    return savedIdea;
  }

  async getMyIdeas(userId: string, pagination: PaginationDto): Promise<{
    ideas: Idea[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [ideas, total] = await this.ideaRepository.findAndCount({
      where: { userId },
      relations: ['user', 'likes', 'comments'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Remove password from user objects and add counts
    const ideasWithCounts = ideas.map((idea) => {
      let userWithoutPassword = idea.user;
      if (idea.user && 'password' in idea.user) {
        const { password, ...rest } = idea.user as any;
        userWithoutPassword = rest;
      }
      return {
        ...idea,
        user: userWithoutPassword,
        likesCount: idea.likes?.length || 0,
        commentsCount: idea.comments?.length || 0,
      };
    });

    return {
      ideas: ideasWithCounts as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIdeasByUserId(userId: string, pagination: PaginationDto): Promise<{
    ideas: Idea[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Only return PUBLISHED ideas for public profile
    const [ideas, total] = await this.ideaRepository.findAndCount({
      where: { userId, status: IdeaStatus.PUBLISHED },
      relations: ['user', 'likes', 'comments'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Remove password from user objects and add counts
    const ideasWithCounts = ideas.map((idea) => {
      let userWithoutPassword = idea.user;
      if (idea.user && 'password' in idea.user) {
        const { password, ...rest } = idea.user as any;
        userWithoutPassword = rest;
      }
      
      // Format profile picture URL if exists
      if (userWithoutPassword && (userWithoutPassword as any).profilePicture) {
        const profilePic = (userWithoutPassword as any).profilePicture;
        if (!profilePic.startsWith('/api/')) {
          (userWithoutPassword as any).profilePicture = `/api/uploads/profile-pictures/${profilePic}`;
        }
      }
      
      return {
        ...idea,
        user: userWithoutPassword,
        likesCount: idea.likes?.length || 0,
        commentsCount: idea.comments?.length || 0,
      };
    });

    return {
      ideas: ideasWithCounts as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

