import { AppDataSource } from '../config/database';
import { Hackathon } from '../entities/Hackathon';
import { User } from '../entities/User';
import { UserRole } from '../enums/UserRole';
import { HackathonStatus } from '../enums/HackathonStatus';
import { HackathonType } from '../enums/HackathonType';
import { CreateHackathonDto, UpdateHackathonDto } from '../dto/hackathon.dto';

export class HackathonService {
  private hackathonRepository = AppDataSource.getRepository(Hackathon);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Calculate hackathon status based on current date/time and hackathon dates/times
   * Only for Learning hackathons
   */
  private calculateStatus(hackathon: Hackathon): HackathonStatus {
    // Don't auto-calculate status for Hands-On hackathons (they use DRAFT/OPEN/CLOSED)
    if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      return hackathon.status;
    }

    const now = new Date();
    const startDate = new Date(hackathon.startDate);
    const endDate = new Date(hackathon.endDate);

    // Compare actual date and time (not just dates)
    // If end date/time has passed, hackathon is completed
    if (endDate < now) {
      return HackathonStatus.COMPLETED;
    }

    // If current time is between start and end date/time, hackathon is active
    if (startDate <= now && now <= endDate) {
      return HackathonStatus.ACTIVE;
    }

    // If start date/time is in the future, hackathon is pending (upcoming)
    return HackathonStatus.PENDING;
  }

  /**
   * Update hackathon status based on dates if needed
   * Only for Learning hackathons
   */
  async updateStatusIfNeeded(hackathon: Hackathon): Promise<Hackathon> {
    // Don't auto-update status for Hands-On hackathons
    if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      return hackathon;
    }

    const calculatedStatus = this.calculateStatus(hackathon);
    
    // Only update if status has changed
    if (hackathon.status !== calculatedStatus) {
      hackathon.status = calculatedStatus;
      return await this.hackathonRepository.save(hackathon);
    }
    
    return hackathon;
  }

  /**
   * Update Hands-On hackathon status based on registration dates and registration count
   * Rules:
   * - If registration date has passed AND no one registered → set to CLOSED
   * - If registration date hasn't passed → set to OPEN (unless manually set to DRAFT)
   */
  async updateHandsOnStatusIfNeeded(hackathon: Hackathon): Promise<Hackathon> {
    // Only process Hands-On hackathons
    if (hackathon.hackathonType !== HackathonType.HANDS_ON) {
      return hackathon;
    }

    // Don't update if status is DRAFT (admin must manually change to OPEN)
    if (hackathon.status === HackathonStatus.DRAFT) {
      return hackathon;
    }

    const now = new Date();
    let shouldUpdate = false;
    let newStatus = hackathon.status;

    // Check if registration deadline exists
    if (hackathon.registrationDeadline) {
      const deadlineDate = new Date(hackathon.registrationDeadline);
      
      if (now > deadlineDate) {
        // Registration deadline has passed - check if anyone registered
        const { RegistrationService } = await import('./registration.service');
        const registrationService = new RegistrationService();
        const registrations = await registrationService.getRegistrationsByHackathon(hackathon.id);
        
        if (registrations.length === 0) {
          // No registrations and deadline passed → set to CLOSED
          if (hackathon.status !== HackathonStatus.CLOSED) {
            newStatus = HackathonStatus.CLOSED;
            shouldUpdate = true;
          }
        }
        // If there are registrations, keep current status (don't auto-change)
      } else {
        // Registration deadline hasn't passed → set to OPEN
        if (hackathon.status !== HackathonStatus.OPEN) {
          newStatus = HackathonStatus.OPEN;
          shouldUpdate = true;
        }
      }
    } else {
      // No registration end date set - if status is CLOSED, set to OPEN (but keep DRAFT as is)
      if (hackathon.status === HackathonStatus.CLOSED) {
        newStatus = HackathonStatus.OPEN;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      hackathon.status = newStatus;
      return await this.hackathonRepository.save(hackathon);
    }
    
    return hackathon;
  }

  async createHackathon(userId: string, createHackathonDto: CreateHackathonDto): Promise<Hackathon> {
    const startDate = new Date(createHackathonDto.startDate);
    const endDate = new Date(createHackathonDto.endDate);
    const hackathonType = createHackathonDto.hackathonType || HackathonType.LEARNING;
    
    // For Hands-On hackathons, use provided status or default to DRAFT
    // For Learning hackathons, calculate initial status based on date/time
    let initialStatus: HackathonStatus;
    if (hackathonType === HackathonType.HANDS_ON) {
      initialStatus = createHackathonDto.status || HackathonStatus.DRAFT;
    } else {
      const now = new Date();
      if (endDate < now) {
        initialStatus = HackathonStatus.COMPLETED;
      } else if (startDate <= now && now <= endDate) {
        initialStatus = HackathonStatus.ACTIVE;
      } else {
        initialStatus = HackathonStatus.PENDING;
      }
    }

    // Validate users if provided (for assigning as judges)
    if (createHackathonDto.judgeIds && createHackathonDto.judgeIds.length > 0) {
      // Verify all judgeIds are valid users (not admins)
      const users = await this.userRepository.find({
        where: createHackathonDto.judgeIds.map(id => ({ id })),
      });

      if (users.length !== createHackathonDto.judgeIds.length) {
        throw new Error('One or more selected users not found');
      }

      // Check that none are admins
      const adminUsers = users.filter(u => u.role === UserRole.ADMIN);
      if (adminUsers.length > 0) {
        throw new Error('Admins cannot be assigned as judges');
      }
    }

    const hackathonData: Partial<Hackathon> = {
      title: createHackathonDto.title,
      purpose: createHackathonDto.purpose,
      description: createHackathonDto.description || '',
      startDate: new Date(createHackathonDto.startDate),
      endDate: new Date(createHackathonDto.endDate),
      registrationDeadline: createHackathonDto.registrationDeadline 
        ? new Date(createHackathonDto.registrationDeadline) 
        : undefined,
      // Hands-On Hackathon fields
      hackathonType: hackathonType,
      location: createHackathonDto.location,
      onlineLink: createHackathonDto.onlineLink || undefined,
      status: initialStatus,
      createdBy: userId,
      judgeIds: createHackathonDto.judgeIds && createHackathonDto.judgeIds.length > 0 
        ? createHackathonDto.judgeIds 
        : undefined,
    };
    
    const hackathon = this.hackathonRepository.create(hackathonData);
    return await this.hackathonRepository.save(hackathon);
  }

  async getAllHackathons(userRole?: string, userId?: string): Promise<Hackathon[]> {
    // For all users (including judges), show all hackathons
    // Action restrictions are handled in the frontend and individual action methods
    const hackathons = await this.hackathonRepository.find({
      relations: ['creator'],
      order: { startDate: 'DESC' },
    });

    // Update status for both Learning and Hands-On hackathons
    const updatedHackathons = await Promise.all(
      hackathons.map(hackathon => {
        if (hackathon.hackathonType === HackathonType.LEARNING) {
          // Auto-update status for Learning hackathons
          return this.updateStatusIfNeeded(hackathon);
        } else if (hackathon.hackathonType === HackathonType.HANDS_ON) {
          // Auto-update status for Hands-On hackathons based on registration dates
          return this.updateHandsOnStatusIfNeeded(hackathon);
        }
        return Promise.resolve(hackathon);
      })
    );

    // Filter out DRAFT Hands-On hackathons for regular users
    const isAdmin = userRole === 'ADMIN';
    if (isAdmin) {
      return updatedHackathons;
    }

    // Regular users cannot see DRAFT Hands-On hackathons
    return updatedHackathons.filter(hackathon => {
      if (hackathon.hackathonType === HackathonType.HANDS_ON && hackathon.status === HackathonStatus.DRAFT) {
        return false;
      }
      return true;
    });
  }

  async getHackathonById(id: string, userRole?: string, userId?: string): Promise<Hackathon> {
    const hackathon = await this.hackathonRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!hackathon) {
      throw new Error('Hackathon not found');
    }

    // Check if regular user is trying to access DRAFT Hands-On hackathon
    const isAdmin = userRole === 'ADMIN';
    if (!isAdmin && hackathon.hackathonType === HackathonType.HANDS_ON && hackathon.status === HackathonStatus.DRAFT) {
      throw new Error('Hackathon not found');
    }

    // Update status based on hackathon type
    if (hackathon.hackathonType === HackathonType.LEARNING) {
      return await this.updateStatusIfNeeded(hackathon);
    } else if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      return await this.updateHandsOnStatusIfNeeded(hackathon);
    }

    return hackathon;
  }

  async updateHackathon(id: string, userId: string, updateHackathonDto: UpdateHackathonDto): Promise<Hackathon> {
    const hackathon = await this.hackathonRepository.findOne({
      where: { id, createdBy: userId },
    });

    if (!hackathon) {
      throw new Error('Hackathon not found or you do not have permission to update it');
    }

    if (updateHackathonDto.title) hackathon.title = updateHackathonDto.title;
    if (updateHackathonDto.purpose) hackathon.purpose = updateHackathonDto.purpose;
    if (updateHackathonDto.description !== undefined) hackathon.description = updateHackathonDto.description;
    if (updateHackathonDto.startDate) hackathon.startDate = new Date(updateHackathonDto.startDate);
    if (updateHackathonDto.endDate) hackathon.endDate = new Date(updateHackathonDto.endDate);
    if (updateHackathonDto.registrationDeadline !== undefined) {
      hackathon.registrationDeadline = updateHackathonDto.registrationDeadline 
        ? new Date(updateHackathonDto.registrationDeadline) 
        : (null as any);
    }
    // Hands-On Hackathon fields
    if (updateHackathonDto.hackathonType !== undefined) hackathon.hackathonType = updateHackathonDto.hackathonType;
    if (updateHackathonDto.location) hackathon.location = updateHackathonDto.location;
    if (updateHackathonDto.onlineLink !== undefined) hackathon.onlineLink = updateHackathonDto.onlineLink;

    const savedHackathon = await this.hackathonRepository.save(hackathon);
    
    // Update status based on dates after saving
    return await this.updateStatusIfNeeded(savedHackathon);
  }

  async updateHackathonStatus(id: string, status: HackathonStatus, userId?: string, userRole?: string): Promise<Hackathon> {
    const hackathon = await this.hackathonRepository.findOne({ where: { id } });

    if (!hackathon) {
      throw new Error('Hackathon not found');
    }

    // For Hands-On hackathons, check if user is assigned judge or admin
    if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      if (userRole === 'ADMIN') {
        // Admins can always update status
        // No check needed
      } else if (userRole === 'USER' && userId) {
        // Check if user is assigned as judge for this hackathon
        // Handle judgeIds - it might be a string (from simple-array) or an array
        let judgeIdsArray: string[] = [];
        const judgeIdsValue = hackathon.judgeIds;
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
          if (!judgeIdsArray.includes(userId)) {
            throw new Error('You are not assigned to this hackathon. Only assigned judges can update hackathon status.');
          }
        }
        // If judgeIds is empty or undefined, allow all users
      } else {
        throw new Error('Only admins and assigned judges can update hackathon status for Hands-On hackathons.');
      }
    }

    hackathon.status = status;
    return await this.hackathonRepository.save(hackathon);
  }

  async deleteHackathon(id: string, userId: string): Promise<void> {
    const hackathon = await this.hackathonRepository.findOne({
      where: { id, createdBy: userId },
    });

    if (!hackathon) {
      throw new Error('Hackathon not found or you do not have permission to delete it');
    }

    await this.hackathonRepository.remove(hackathon);
  }

  async getNextHackathon(): Promise<Hackathon | null> {
    // First, update all hackathon statuses
    const allHackathons = await this.getAllHackathons();
    
    // Find the next upcoming or active hackathon
    const now = new Date();
    
    const upcomingOrActive = allHackathons
      .filter(h => {
        const endDate = new Date(h.endDate);
        // Compare actual date/time, not just date
        return endDate >= now && (h.status === HackathonStatus.PENDING || h.status === HackathonStatus.ACTIVE);
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return upcomingOrActive.length > 0 ? upcomingOrActive[0] : null;
  }

  async getHackathonsByStatus(status: HackathonStatus): Promise<Hackathon[]> {
    // First update all statuses
    const allHackathons = await this.getAllHackathons();
    
    // Filter by status
    return allHackathons.filter(h => h.status === status);
  }

  /**
   * Update status for all hackathons based on current dates
   * Useful for scheduled tasks or manual updates
   */
  async updateAllHackathonStatuses(): Promise<number> {
    const allHackathons = await this.hackathonRepository.find();
    let updatedCount = 0;

    for (const hackathon of allHackathons) {
      const calculatedStatus = this.calculateStatus(hackathon);
      if (hackathon.status !== calculatedStatus) {
        hackathon.status = calculatedStatus;
        await this.hackathonRepository.save(hackathon);
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Send reminders to all registered users for a hackathon
   * Prevents duplicate notifications - only sends if user doesn't have an unread reminder
   */
  async sendRemindersToRegisteredUsers(hackathonId: string): Promise<{ sent: number; skipped: number; failed: number }> {
    const hackathon = await this.getHackathonById(hackathonId);
    
    // Lazy import to avoid circular dependency
    const { RegistrationService } = await import('./registration.service');
    const { NotificationService } = await import('./notification.service');
    
    const registrationService = new RegistrationService();
    const notificationService = new NotificationService();
    
    // Get all registrations for this hackathon
    const registrations = await registrationService.getRegistrationsByHackathon(hackathonId);
    
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Send reminder notification to each registered user
    for (const registration of registrations) {
      try {
        const reminder = await notificationService.createHackathonReminder(
          registration.userId,
          hackathonId
        );
        
        if (reminder) {
          sent++; // New reminder created
        } else {
          skipped++; // User already has an unread reminder
        }
      } catch (error) {
        // Failed to send reminder
        failed++;
      }
    }

    return { sent, skipped, failed };
  }
}

