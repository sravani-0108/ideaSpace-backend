import { AppDataSource } from '../config/database';
import { Hackathon } from '../entities/Hackathon';
import { HackathonStatus } from '../enums/HackathonStatus';
import { CreateHackathonDto, UpdateHackathonDto } from '../dto/hackathon.dto';

export class HackathonService {
  private hackathonRepository = AppDataSource.getRepository(Hackathon);

  /**
   * Calculate hackathon status based on current date/time and hackathon dates/times
   */
  private calculateStatus(hackathon: Hackathon): HackathonStatus {
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
   */
  async updateStatusIfNeeded(hackathon: Hackathon): Promise<Hackathon> {
    const calculatedStatus = this.calculateStatus(hackathon);
    
    // Only update if status has changed
    if (hackathon.status !== calculatedStatus) {
      hackathon.status = calculatedStatus;
      return await this.hackathonRepository.save(hackathon);
    }
    
    return hackathon;
  }

  async createHackathon(userId: string, createHackathonDto: CreateHackathonDto): Promise<Hackathon> {
    const startDate = new Date(createHackathonDto.startDate);
    const endDate = new Date(createHackathonDto.endDate);
    
    // Calculate initial status based on date/time (considering actual time, not just date)
    const now = new Date();
    
    let initialStatus = HackathonStatus.PENDING;
    if (endDate < now) {
      initialStatus = HackathonStatus.COMPLETED;
    } else if (startDate <= now && now <= endDate) {
      initialStatus = HackathonStatus.ACTIVE;
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
      location: createHackathonDto.location,
      onlineLink: createHackathonDto.onlineLink || undefined,
      status: initialStatus,
      createdBy: userId,
    };
    
    const hackathon = this.hackathonRepository.create(hackathonData);
    return await this.hackathonRepository.save(hackathon);
  }

  async getAllHackathons(): Promise<Hackathon[]> {
    const hackathons = await this.hackathonRepository.find({
      relations: ['creator'],
      order: { startDate: 'DESC' },
    });

    // Update status for all hackathons based on current dates
    const updatedHackathons = await Promise.all(
      hackathons.map(hackathon => this.updateStatusIfNeeded(hackathon))
    );

    return updatedHackathons;
  }

  async getHackathonById(id: string): Promise<Hackathon> {
    const hackathon = await this.hackathonRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!hackathon) {
      throw new Error('Hackathon not found');
    }

    // Update status based on current dates
    return await this.updateStatusIfNeeded(hackathon);
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
    if (updateHackathonDto.location) hackathon.location = updateHackathonDto.location;
    if (updateHackathonDto.onlineLink !== undefined) hackathon.onlineLink = updateHackathonDto.onlineLink;

    const savedHackathon = await this.hackathonRepository.save(hackathon);
    
    // Update status based on dates after saving
    return await this.updateStatusIfNeeded(savedHackathon);
  }

  async updateHackathonStatus(id: string, status: HackathonStatus): Promise<Hackathon> {
    const hackathon = await this.hackathonRepository.findOne({ where: { id } });

    if (!hackathon) {
      throw new Error('Hackathon not found');
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
        console.error(`Failed to send reminder to user ${registration.userId}:`, error);
        failed++;
      }
    }

    return { sent, skipped, failed };
  }
}

