import { AppDataSource } from '../config/database';
import { Idea } from '../entities/Idea';
import { Comment } from '../entities/Comment';
import { Hackathon } from '../entities/Hackathon';
import { Project } from '../entities/Project';
import { IdeaStatus } from '../enums/IdeaStatus';
import { UserRole } from '../enums/UserRole';
import { HackathonType } from '../enums/HackathonType';
import { HackathonStatus } from '../enums/HackathonStatus';
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

      // For Hands-On hackathons, check if status is OPEN
      if (hackathon.status !== HackathonStatus.OPEN) {
        if (hackathon.status === HackathonStatus.DRAFT) {
          throw new Error('Hackathon is not yet open for submissions');
        } else if (hackathon.status === HackathonStatus.CLOSED) {
          throw new Error('Hackathon is closed. Submissions are no longer accepted');
        } else {
          throw new Error('Hackathon is not open for submissions');
        }
      }

      // Check if user already has an idea for this hackathon - if so, update it instead
      const existingIdea = await this.ideaRepository.findOne({
        where: {
          userId,
          hackathonId: createIdeaDto.hackathonId,
        },
      });

      if (existingIdea) {
        // If user has existing idea, they can always update it (they're already registered)
        // No need to check registration deadline
        // Update existing idea - reset status to PENDING if it was rejected
        existingIdea.title = createIdeaDto.title;
        existingIdea.description = createIdeaDto.description;
        // Update file uploads if provided
        if (createIdeaDto.gitRepositoryUrl !== undefined) {
          existingIdea.gitRepositoryUrl = createIdeaDto.gitRepositoryUrl;
        }
        if (createIdeaDto.documentationUrl !== undefined) {
          existingIdea.documentationUrl = createIdeaDto.documentationUrl;
        }
        if (createIdeaDto.videoUrl !== undefined) {
          existingIdea.videoUrl = createIdeaDto.videoUrl;
        }
        if (createIdeaDto.zipFilePath !== undefined) {
          existingIdea.zipFilePath = createIdeaDto.zipFilePath;
        }
        // If idea was rejected, reset to PENDING for re-review
        if (existingIdea.status === IdeaStatus.REJECTED) {
          existingIdea.status = IdeaStatus.PENDING;
          existingIdea.rejectionReason = undefined;
        }
        return await this.ideaRepository.save(existingIdea);
      }

      // For new submissions, check if user is registered
      // If NOT registered, check registration deadline
      const { RegistrationService } = await import('./registration.service');
      const registrationService = new RegistrationService();
      const isRegistered = await registrationService.isUserRegistered(createIdeaDto.hackathonId, userId);
      
      if (!isRegistered) {
        // Check if registration deadline has passed
        const now = new Date();
        if (hackathon.registrationDeadline && now > new Date(hackathon.registrationDeadline)) {
          throw new Error('Idea submission deadline has passed. Please register before the deadline.');
        }
      }
      // If registered, allow submission regardless of registration deadline
    }

    // Admin ideas are automatically approved and published, regular users go to PENDING
    // For Hands-On hackathons, all ideas start as PENDING regardless of role
    const isHandsOnHackathon = !!createIdeaDto.hackathonId;
    const isAdmin = userRole === UserRole.ADMIN;
    const status = (isAdmin && !isHandsOnHackathon) 
      ? IdeaStatus.PUBLISHED 
      : IdeaStatus.PENDING;
    
    const ideaData: Partial<Idea> = {
      userId,
      title: createIdeaDto.title,
      description: createIdeaDto.description,
      status,
      hackathonId: createIdeaDto.hackathonId,
      gitRepositoryUrl: createIdeaDto.gitRepositoryUrl,
      documentationUrl: createIdeaDto.documentationUrl,
      videoUrl: createIdeaDto.videoUrl,
      zipFilePath: createIdeaDto.zipFilePath,
    };

    // If admin creates idea (and not for Hands-On hackathon), set approvedBy to admin's ID
    if (isAdmin && !isHandsOnHackathon) {
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

  async getIdeaById(id: string, userId?: string, userRole?: UserRole): Promise<Idea> {
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

    // Check if user is Admin
    const isAdmin = userRole === UserRole.ADMIN;

    // Check if user is assigned as a judge for this hackathon (if idea belongs to a Hands-On hackathon)
    let isAssignedJudge = false;
    if (userId && idea.hackathon && idea.hackathon.hackathonType === HackathonType.HANDS_ON && idea.hackathon.judgeIds) {
      // Handle judgeIds - it might be a string (from simple-array) or an array
      let judgeIdsArray: string[] = [];
      const judgeIdsValue = idea.hackathon.judgeIds;
      if (Array.isArray(judgeIdsValue)) {
        judgeIdsArray = judgeIdsValue;
      } else {
        // Handle case where it might be a string (from simple-array serialization)
        const judgeIdsStr = String(judgeIdsValue);
        if (judgeIdsStr.length > 0) {
          judgeIdsArray = judgeIdsStr.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        }
      }
      isAssignedJudge = judgeIdsArray.length > 0 && judgeIdsArray.includes(userId);
    }

    // Only return published ideas to regular users
    // But allow users to see their own PENDING/APPROVED ideas
    // Admins and assigned judges can see all ideas regardless of status
    if (idea.status !== IdeaStatus.PUBLISHED && !isAdmin && !isAssignedJudge) {
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
    }

    return savedIdea;
  }

  /**
   * Update idea status (for Hands-On hackathons)
   * Allows updating status to UNDER_REVIEW, PITCHING, ENHANCEMENTS, IMPLEMENTATION, COMPLETED
   */
  async updateIdeaStatus(
    id: string, 
    newStatus: IdeaStatus, 
    statusDeadline?: Date,
    adminId?: string,
    rejectionReason?: string,
    userRole?: string
  ): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({ 
      where: { id },
      relations: ['hackathon'],
    });

    if (!idea) {
      throw new Error('Idea not found');
    }

    // For Hands-On hackathon ideas, check if user is assigned judge or admin
    if (idea.hackathon && idea.hackathon.hackathonType === HackathonType.HANDS_ON) {
      if (userRole === 'ADMIN') {
        // Admins can always update status
        // No check needed
      } else if (userRole === 'USER') {
        // Check if user is assigned as judge for this hackathon
        // Handle judgeIds - it might be a string (from simple-array) or an array
        let judgeIdsArray: string[] = [];
        const judgeIdsValue = idea.hackathon.judgeIds;
        if (Array.isArray(judgeIdsValue)) {
          judgeIdsArray = judgeIdsValue;
        } else if (judgeIdsValue) {
          // Handle case where it might be a string (from simple-array serialization)
          const judgeIdsStr = String(judgeIdsValue);
          if (judgeIdsStr.length > 0) {
            judgeIdsArray = judgeIdsStr.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
          }
        }
        
        // If no judges are assigned, all users can perform actions
        // If judges are assigned, only assigned users can perform actions
        if (judgeIdsArray.length > 0) {
          if (!judgeIdsArray.includes(adminId!)) {
            throw new Error('You are not assigned to this hackathon. Only assigned judges can update idea status.');
          }
        }
        // If judgeIds is empty or undefined, allow all users
      } else {
        throw new Error('Only admins and assigned judges can update idea status for Hands-On hackathons.');
      }
    }

    // Validate status transition for Hands-On hackathons
    const handsOnStatuses = [
      IdeaStatus.UNDER_REVIEW,
      IdeaStatus.PITCHING,
      IdeaStatus.ENHANCEMENTS,
      IdeaStatus.IMPLEMENTATION,
      IdeaStatus.COMPLETED,
      IdeaStatus.REJECTED
    ];

    // Check if this is a Hands-On hackathon idea
    if (idea.hackathonId) {
      if (idea.hackathon) {
        if (idea.hackathon.hackathonType !== HackathonType.HANDS_ON) {
          throw new Error('Status updates are only allowed for Hands-On hackathon ideas');
        }
      } else {
        // If hackathon relation is not loaded, fetch it
        const hackathonRepository = AppDataSource.getRepository(Hackathon);
        const hackathon = await hackathonRepository.findOne({ where: { id: idea.hackathonId } });
        if (hackathon && hackathon.hackathonType !== HackathonType.HANDS_ON) {
          throw new Error('Status updates are only allowed for Hands-On hackathon ideas');
        }
      }
    }

    if (handsOnStatuses.includes(newStatus)) {
      idea.status = newStatus;
      
      // Set status deadline for statuses that require it
      if (statusDeadline && (newStatus === IdeaStatus.PITCHING || 
                             newStatus === IdeaStatus.ENHANCEMENTS || 
                             newStatus === IdeaStatus.IMPLEMENTATION)) {
        idea.statusDeadline = statusDeadline;
      } else if (newStatus === IdeaStatus.COMPLETED || 
                 newStatus === IdeaStatus.UNDER_REVIEW || 
                 newStatus === IdeaStatus.REJECTED) {
        // Clear deadline for COMPLETED, UNDER_REVIEW, and REJECTED
        // Use null instead of undefined for TypeORM nullable fields
        idea.statusDeadline = null as any;
      }

      // Handle rejection reason
      if (newStatus === IdeaStatus.REJECTED) {
        if (rejectionReason) {
          idea.rejectionReason = rejectionReason;
        }
      } else {
        // Clear rejection reason if status is not REJECTED
        idea.rejectionReason = null as any;
      }

      // Set approvedBy if not already set
      if (adminId && !idea.approvedBy) {
        idea.approvedBy = adminId;
      }

      return await this.ideaRepository.save(idea);
    }

    throw new Error(`Invalid status transition to ${newStatus}`);
  }

  /**
   * Update project details for ideas in ENHANCEMENTS or IMPLEMENTATION phase
   * This replaces the need for a separate projects table
   */
  async updateProjectDetails(
    ideaId: string,
    userId: string,
    updateDto: {
      githubUrl?: string;
      demoVideoUrl?: string;
      documentationUrl?: string;
      zipFilePath?: string;
      projectDescription?: string;
      implementationDetails?: string;
      pitchVideoUrl?: string;
      presentationUrl?: string;
    }
  ): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({
      where: { id: ideaId },
      relations: ['hackathon', 'user'],
    });

    if (!idea) {
      throw new Error('Idea not found');
    }

    // Only allow the idea owner to update project details
    if (idea.userId !== userId) {
      throw new Error('You can only update project details for your own ideas');
    }

    // Only allow updates for ENHANCEMENTS or IMPLEMENTATION phases
    const allowedStatuses = [IdeaStatus.ENHANCEMENTS, IdeaStatus.IMPLEMENTATION];
    if (!allowedStatuses.includes(idea.status)) {
      throw new Error('Project details can only be updated during Enhancements or Implementation phase');
    }

    // Check if statusDeadline has passed
    if (idea.statusDeadline) {
      const now = new Date();
      if (now > new Date(idea.statusDeadline)) {
        throw new Error('The deadline for updating project details has passed');
      }
    }

    // Update project fields
    if (updateDto.githubUrl !== undefined) {
      idea.githubUrl = updateDto.githubUrl;
    }
    if (updateDto.demoVideoUrl !== undefined) {
      idea.demoVideoUrl = updateDto.demoVideoUrl;
    }
    if (updateDto.documentationUrl !== undefined) {
      idea.documentationUrl = updateDto.documentationUrl;
    }
    if (updateDto.zipFilePath !== undefined) {
      idea.zipFilePath = updateDto.zipFilePath;
    }
    if (updateDto.projectDescription !== undefined) {
      idea.projectDescription = updateDto.projectDescription;
    }
    if (updateDto.implementationDetails !== undefined) {
      idea.implementationDetails = updateDto.implementationDetails;
    }
    if (updateDto.pitchVideoUrl !== undefined) {
      idea.pitchVideoUrl = updateDto.pitchVideoUrl;
    }
    if (updateDto.presentationUrl !== undefined) {
      idea.presentationUrl = updateDto.presentationUrl;
    }

    return await this.ideaRepository.save(idea);
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
    const registrationEnded = hackathon.registrationDeadline 
      ? now > new Date(hackathon.registrationDeadline)
      : true; // If no registration deadline, assume registration has ended

    // Check if user is Admin
    const isAdmin = userRole === UserRole.ADMIN;

    // Check if user is assigned as a judge for this hackathon
    let isAssignedJudge = false;
    if (userId && hackathon.judgeIds) {
      // Handle judgeIds - it might be a string (from simple-array) or an array
      let judgeIdsArray: string[] = [];
      const judgeIdsValue = hackathon.judgeIds;
      if (Array.isArray(judgeIdsValue)) {
        judgeIdsArray = judgeIdsValue;
      } else {
        // Handle case where it might be a string (from simple-array serialization)
        const judgeIdsStr = String(judgeIdsValue);
        if (judgeIdsStr.length > 0) {
          judgeIdsArray = judgeIdsStr.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
        }
      }
      isAssignedJudge = judgeIdsArray.length > 0 && judgeIdsArray.includes(userId);
    }

    // Check if user is registered for this hackathon (for visibility rules)
    let isUserRegistered = false;
    if (userId) {
      const { RegistrationService } = await import('./registration.service');
      const registrationService = new RegistrationService();
      isUserRegistered = await registrationService.isUserRegistered(hackathonId, userId);
    }

    // Build query
    const queryBuilder = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoinAndSelect('idea.user', 'user')
      .leftJoinAndSelect('idea.hackathon', 'hackathon')
      .where('idea.hackathonId = :hackathonId', { hackathonId });

    // Visibility rules:
    // 1. Admin: Can see ALL ideas (including PENDING)
    // 2. Assigned Judge: Can see ALL ideas (including PENDING)
    // 3. Regular users: 
    //    - If in a team for this hackathon: Can see ideas from all team members
    //    - If not in a team: Can see ONLY their own ideas

    if (isAdmin || isAssignedJudge) {
      // Admin or assigned judge can always see all ideas - no filter needed
    } else {
      if (userId) {
        // Check if user is in a team for this hackathon
        const HackathonRegistration = require('../entities/HackathonRegistration').HackathonRegistration;
        const registrationRepository = AppDataSource.getRepository(HackathonRegistration);
        const registration = await registrationRepository.findOne({
          where: { hackathonId, userId },
        });

        if (registration && registration.teamId) {
          // User is in a team - get all team members' ideas
          const { TeamService } = await import('./team.service');
          const teamService = new TeamService();
          const teamMembers = await teamService.getTeamMembers(registration.teamId);
          const teamMemberIds = teamMembers.map(member => member.userId);
          
          if (teamMemberIds.length > 0) {
            // Show ideas from all team members
            queryBuilder.andWhere('idea.userId IN (:...teamMemberIds)', { teamMemberIds });
          } else {
            // No team members found, show only user's ideas
            queryBuilder.andWhere('idea.userId = :userId', { userId });
          }
        } else {
          // User is not in a team - show only their own ideas
          queryBuilder.andWhere('idea.userId = :userId', { userId });
        }
      } else {
        // Not logged in: can't see any ideas
        queryBuilder.andWhere('1 = 0'); // Always false condition
      }
    }

    // Load ideas with pagination
    const result = await Promise.all([
      queryBuilder
        .orderBy('idea.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany(),
      queryBuilder.getCount(),
    ]);
    const ideas = result[0];
    const total = result[1];

    // Remove passwords and format profile pictures
    const cleanedIdeas = ideas.map((idea) => {
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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

