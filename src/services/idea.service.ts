import { AppDataSource } from '../config/database';
import { Idea } from '../entities/Idea';
import { Comment } from '../entities/Comment';
import { Hackathon } from '../entities/Hackathon';
import { Project } from '../entities/Project';
import { IdeaStatus } from '../enums/IdeaStatus';
import { ProjectStatus } from '../enums/ProjectStatus';
import { UserRole } from '../enums/UserRole';
import { HackathonType } from '../enums/HackathonType';
import { CreateIdeaDto, ApproveIdeaDto } from '../dto/idea.dto';
import { PaginationDto } from '../dto/common.dto';

export class IdeaService {
  private ideaRepository = AppDataSource.getRepository(Idea);

  async createIdea(userId: string, createIdeaDto: CreateIdeaDto, userRole?: UserRole): Promise<Idea> {
    // If this is for a Hands-On hackathon, validate registration period
    if (createIdeaDto.hackathonId) {
      const hackathonRepository = AppDataSource.getRepository(Hackathon);
      const hackathon = await hackathonRepository.findOne({
        where: { id: createIdeaDto.hackathonId },
      });

      if (!hackathon) {
        throw new Error('Hackathon not found');
      }

      if (hackathon.hackathonType !== HackathonType.HANDS_ON) {
        throw new Error('Ideas can only be submitted for Hands-On hackathons');
      }

      // Check if registration period is active
      const now = new Date();
      if (hackathon.registrationStartDate && now < new Date(hackathon.registrationStartDate)) {
        throw new Error('Idea submission has not started yet');
      }
      if (hackathon.registrationEndDate && now > new Date(hackathon.registrationEndDate)) {
        throw new Error('Idea submission period has ended');
      }

      // Check if user already has an idea for this hackathon - if so, update it instead
      const existingIdea = await this.ideaRepository.findOne({
        where: {
          userId,
          hackathonId: createIdeaDto.hackathonId,
        },
      });

      if (existingIdea) {
        // Update existing idea - reset status to PENDING if it was rejected
        existingIdea.title = createIdeaDto.title;
        existingIdea.description = createIdeaDto.description;
        // If idea was rejected, reset to PENDING for re-review
        if (existingIdea.status === IdeaStatus.REJECTED) {
          existingIdea.status = IdeaStatus.PENDING;
          existingIdea.rejectionReason = undefined;
        }
        return await this.ideaRepository.save(existingIdea);
      }
    }

    // Admin/Judge ideas are automatically approved and published, regular users go to PENDING
    // For Hands-On hackathons, all ideas start as PENDING regardless of role
    const isHandsOnHackathon = !!createIdeaDto.hackathonId;
    const isAdminOrJudge = userRole === UserRole.ADMIN || userRole === UserRole.JUDGE;
    const status = (isAdminOrJudge && !isHandsOnHackathon) 
      ? IdeaStatus.PUBLISHED 
      : IdeaStatus.PENDING;
    
    const ideaData: Partial<Idea> = {
      userId,
      title: createIdeaDto.title,
      description: createIdeaDto.description,
      status,
      hackathonId: createIdeaDto.hackathonId,
    };

    // If admin/judge creates idea (and not for Hands-On hackathon), set approvedBy to admin's/judge's ID
    if (isAdminOrJudge && !isHandsOnHackathon) {
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
    // Exclude Hands-On hackathon ideas (they should be accessed via hackathon-specific endpoint)
    const queryBuilder = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoin('idea.user', 'user')
      .leftJoin('idea.likes', 'like')
      .leftJoin('idea.comments', 'comment')
      .leftJoin('idea.hackathon', 'hackathon')
      .where('idea.status = :status', { status: IdeaStatus.PUBLISHED })
      .andWhere('(idea.hackathonId IS NULL OR hackathon.hackathonType != :handsOnType)', { 
        handsOnType: HackathonType.HANDS_ON 
      })
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
        'hackathon', // Include hackathon relation for Hands-On hackathon checks
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

    // Use query builder to ensure hackathon relation is loaded even if null
    const queryBuilder = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoinAndSelect('idea.user', 'user')
      .leftJoinAndSelect('idea.approvedByUser', 'approvedByUser')
      .leftJoinAndSelect('idea.hackathon', 'hackathon')
      .where('idea.status = :status', { status: IdeaStatus.PENDING })
      .orderBy('idea.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    const [ideas, total] = await queryBuilder.getManyAndCount();

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

  async approveIdea(id: string, adminId: string, approveDto?: ApproveIdeaDto): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({ 
      where: { id },
      relations: ['hackathon'],
    });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PENDING) {
      throw new Error('Idea is not in PENDING status');
    }

    idea.status = IdeaStatus.APPROVED;
    idea.approvedBy = adminId;
    
    // For Hands-On hackathons, set project deadline if provided
    if (approveDto?.projectDeadline) {
      idea.projectDeadline = new Date(approveDto.projectDeadline);
    }
    
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

  async rejectIdea(id: string, rejectDto?: ApproveIdeaDto): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({ where: { id } });

    if (!idea) {
      throw new Error('Idea not found');
    }

    if (idea.status !== IdeaStatus.PENDING) {
      throw new Error('Idea is not in PENDING status');
    }

    idea.status = IdeaStatus.REJECTED;
    
    // Add rejection reason if provided
    if (rejectDto?.rejectionReason) {
      idea.rejectionReason = rejectDto.rejectionReason;
    }
    
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

  /**
   * Get ideas for Hands-On hackathon with visibility rules
   * - During registration: Only Admin/Judge can see pending ideas
   * - After registration: All users can see all ideas
   */
  async getHandsOnHackathonIdeas(
    hackathonId: string, 
    userId?: string, 
    userRole?: UserRole,
    pagination?: PaginationDto
  ): Promise<{
    ideas: Idea[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    // Get hackathon to check registration end date
    const hackathonRepository = AppDataSource.getRepository(Hackathon);
    const hackathon = await hackathonRepository.findOne({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new Error('Hackathon not found');
    }

    const now = new Date();
    const registrationEnded = hackathon.registrationEndDate 
      ? now > new Date(hackathon.registrationEndDate)
      : true; // If no registration end date, assume registration has ended

    // Check if user is Admin or Judge
    const isAdminOrJudge = userRole === UserRole.ADMIN || userRole === UserRole.JUDGE;

    // Check if user is registered for this hackathon (for visibility rules)
    let isUserRegistered = false;
    if (userId) {
      const { RegistrationService } = await import('./registration.service');
      const registrationService = new RegistrationService();
      isUserRegistered = await registrationService.isUserRegistered(hackathonId, userId);
    }

    // Build query with project join to check project status
    const queryBuilder = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoinAndSelect('idea.user', 'user')
      .leftJoinAndSelect('idea.hackathon', 'hackathon')
      .leftJoin('projects', 'project', 'project.ideaId = idea.id')
      .where('idea.hackathonId = :hackathonId', { hackathonId });

    // Visibility rules:
    // 1. During registration (before registration ends):
    //    - Admin/Judge: Can see ALL ideas (including PENDING)
    //    - Regular users: Can see ONLY their own ideas
    // 2. After registration ends:
    //    - Admin/Judge: Can see ALL ideas
    //    - Regular users: Cannot see ideas yet (even if approved)
    // 3. After project is submitted and reviewed:
    //    - If project status is COMPLETED (win): All registered users can see
    //    - If project status is DISQUALIFIED (rejected): Only Admin and owner can see
    //    - Otherwise: Only Admin/Judge can see

    if (isAdminOrJudge) {
      // Admin/Judge can always see all ideas - no filter needed
    } else if (!registrationEnded) {
      // During registration: Regular users can only see their own ideas
      if (userId) {
        queryBuilder.andWhere('idea.userId = :userId', { userId });
      } else {
        // Not logged in during registration: can't see any ideas
        queryBuilder.andWhere('1 = 0'); // Always false condition
      }
    } else {
      // After registration ends: Need to load ALL ideas to check project status
      // Don't filter in SQL - we'll filter by project status after loading
      if (!userId) {
        // Not logged in after registration: can't see any ideas
        queryBuilder.andWhere('1 = 0'); // Always false condition
      }
      // If userId exists, load all ideas and filter by project status below
    }

    // Load ideas (all ideas if admin/judge or after registration, filtered if during registration)
    let ideas: Idea[];
    let totalBeforeFilter: number;
    
    if (!isAdminOrJudge && registrationEnded && userId) {
      // After registration: Load ALL ideas first (no pagination yet)
      // We need to filter by project status, then apply pagination
      const allIdeasQuery = this.ideaRepository
        .createQueryBuilder('idea')
        .leftJoinAndSelect('idea.user', 'user')
        .leftJoinAndSelect('idea.hackathon', 'hackathon')
        .where('idea.hackathonId = :hackathonId', { hackathonId });
      
      ideas = await allIdeasQuery.getMany();
      totalBeforeFilter = ideas.length;
    } else {
      // During registration or admin/judge: Use paginated query
      const result = await Promise.all([
        queryBuilder
          .orderBy('idea.createdAt', 'DESC')
          .skip(skip)
          .take(limit)
          .getMany(),
        queryBuilder.getCount(),
      ]);
      ideas = result[0];
      totalBeforeFilter = result[1];
    }

    // Load projects for each idea to check status
    const projectRepository = AppDataSource.getRepository(Project);
    const ideasWithProjects = await Promise.all(
      ideas.map(async (idea) => {
        const project = await projectRepository.findOne({
          where: { ideaId: idea.id },
        });
        return { idea, project };
      })
    );

    // Filter ideas based on project status for non-admin users after registration
    let filteredIdeas = ideasWithProjects;
    if (!isAdminOrJudge && registrationEnded && userId) {
      // After registration ends: Regular users can only see:
      // 1. Their own ideas (to submit/update project)
      // 2. Ideas where project status is COMPLETED (win) AND user is registered
      // 3. Their own ideas even if project is DISQUALIFIED (to see rejection)
      filteredIdeas = ideasWithProjects.filter(({ idea, project }) => {
        // Owner can always see their own idea (to submit project or see status)
        if (idea.userId === userId) {
          return true;
        }
        // Registered users can see winning projects (COMPLETED status)
        if (project && project.status === ProjectStatus.COMPLETED && isUserRegistered) {
          return true;
        }
        // All other cases: user cannot see
        return false;
      });
      
      // Apply pagination after filtering
      filteredIdeas = filteredIdeas
        .sort((a, b) => new Date(b.idea.createdAt).getTime() - new Date(a.idea.createdAt).getTime())
        .slice(skip, skip + limit);
    } else if (!isAdminOrJudge && registrationEnded && !userId) {
      // Not logged in after registration: can't see any ideas
      filteredIdeas = [];
    }

    // Remove passwords and format profile pictures
    const cleanedIdeas = filteredIdeas.map(({ idea }) => {
      let userWithoutPassword = idea.user;
      if (idea.user && 'password' in idea.user) {
        const { password, ...rest } = idea.user as any;
        userWithoutPassword = rest;
        if (rest.profilePicture && !rest.profilePicture.startsWith('/api/')) {
          rest.profilePicture = `/api/uploads/profile-pictures/${rest.profilePicture}`;
        }
      }
      return {
        ...idea,
        user: userWithoutPassword,
      };
    });

    return {
      ideas: cleanedIdeas,
      total: filteredIdeas.length,
      page,
      limit,
      totalPages: Math.ceil(filteredIdeas.length / limit),
    };
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
      relations: ['user', 'likes', 'comments', 'hackathon'], // Added 'hackathon' relation
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

