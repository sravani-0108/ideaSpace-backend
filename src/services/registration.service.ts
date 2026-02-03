import { AppDataSource } from '../config/database';
import { HackathonRegistration } from '../entities/HackathonRegistration';
import { Hackathon } from '../entities/Hackathon';
import { HackathonStatus } from '../enums/HackathonStatus';
import { HackathonType } from '../enums/HackathonType';
import { NotificationService } from './notification.service';
import { NotificationType } from '../enums/NotificationType';

export class RegistrationService {
  private registrationRepository = AppDataSource.getRepository(HackathonRegistration);
  private hackathonRepository = AppDataSource.getRepository(Hackathon);
  private notificationService = new NotificationService();

  async registerForHackathon(hackathonId: string, userId: string): Promise<HackathonRegistration> {
    const hackathon = await this.hackathonRepository.findOne({ where: { id: hackathonId } });

    if (!hackathon) {
      throw new Error('Hackathon not found');
    }

    // Prevent assigned judges from registering
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
    
    if (judgeIdsArray.length > 0 && judgeIdsArray.includes(userId)) {
      throw new Error('You are assigned as a judge for this hackathon and cannot register as a participant');
    }

    // Lazy import to avoid circular dependency
    const { HackathonService } = await import('./hackathon.service');
    const hackathonService = new HackathonService();
    
    // Update hackathon status for Learning hackathons only
    let updatedHackathon = hackathon;
    if (hackathon.hackathonType === HackathonType.LEARNING) {
      updatedHackathon = await hackathonService.updateStatusIfNeeded(hackathon);
    }

    // For Hands-On hackathons, check status and registration dates
    if (updatedHackathon.hackathonType === HackathonType.HANDS_ON) {
      if (updatedHackathon.status !== HackathonStatus.OPEN) {
        if (updatedHackathon.status === HackathonStatus.DRAFT) {
          throw new Error('Hackathon is not yet open for registration');
        } else if (updatedHackathon.status === HackathonStatus.CLOSED) {
          throw new Error('Hackathon is closed. Registration is no longer accepted');
        } else {
          throw new Error('Hackathon is not open for registration');
        }
      }
      
      // Check registration deadline
      const now = new Date();
      if (updatedHackathon.registrationDeadline && now > new Date(updatedHackathon.registrationDeadline)) {
        throw new Error('Registration deadline has passed');
      }
    } else {
      // For Learning hackathons, check if completed
      if (updatedHackathon.status === HackathonStatus.COMPLETED) {
        throw new Error('Cannot register for completed hackathon');
      }

      // Check if registration deadline has passed
      if (updatedHackathon.registrationDeadline && new Date() > updatedHackathon.registrationDeadline) {
        throw new Error('Registration deadline has passed');
      }
    }

    // Check if already registered
    const existingRegistration = await this.registrationRepository.findOne({
      where: { hackathonId, userId },
    });

    if (existingRegistration) {
      throw new Error('You are already registered for this hackathon');
    }

    const registration = this.registrationRepository.create({
      hackathonId,
      userId,
    });

    const savedRegistration = await this.registrationRepository.save(registration);

    // Create registration success notification for user
    await this.notificationService.createHackathonRegistrationNotification(
      userId,
      hackathonId
    ).catch((error) => {
      // Don't throw - notification failure shouldn't break registration
    });

    return savedRegistration;
  }

  async unregisterFromHackathon(hackathonId: string, userId: string): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { hackathonId, userId },
    });

    if (!registration) {
      throw new Error('You are not registered for this hackathon');
    }

    await this.registrationRepository.remove(registration);
  }

  async getRegistrationsByHackathon(hackathonId: string): Promise<HackathonRegistration[]> {
    const registrations = await this.registrationRepository.find({
      where: { hackathonId },
      relations: ['user', 'hackathon'],
      order: { createdAt: 'DESC' },
    });

    // Lazy import to avoid circular dependency
    if (registrations.length > 0 && registrations[0].hackathon) {
      const { HackathonService } = await import('./hackathon.service');
      const hackathonService = new HackathonService();
      await hackathonService.updateStatusIfNeeded(registrations[0].hackathon);
    }

    return registrations;
  }

  async getUserRegistrations(userId: string): Promise<HackathonRegistration[]> {
    const registrations = await this.registrationRepository.find({
      where: { userId },
      relations: ['hackathon', 'hackathon.creator'],
      order: { createdAt: 'DESC' },
    });

    // Lazy import to avoid circular dependency
    const { HackathonService } = await import('./hackathon.service');
    const hackathonService = new HackathonService();
    
    // Update status for all hackathons in registrations
    const updatedRegistrations = await Promise.all(
      registrations.map(async (registration) => {
        if (registration.hackathon) {
          registration.hackathon = await hackathonService.updateStatusIfNeeded(registration.hackathon);
        }
        return registration;
      })
    );

    return updatedRegistrations;
  }

  async isUserRegistered(hackathonId: string, userId: string): Promise<boolean> {
    const registration = await this.registrationRepository.findOne({
      where: { hackathonId, userId },
    });

    return !!registration;
  }

  async assignUserToTeam(hackathonId: string, userId: string, teamId: string): Promise<HackathonRegistration> {
    const registration = await this.registrationRepository.findOne({
      where: { hackathonId, userId },
    });

    if (!registration) {
      throw new Error('User is not registered for this hackathon');
    }

    registration.teamId = teamId;
    return await this.registrationRepository.save(registration);
  }
}

