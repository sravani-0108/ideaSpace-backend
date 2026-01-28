import { AppDataSource } from '../config/database';
import { HackathonRegistration } from '../entities/HackathonRegistration';
import { Hackathon } from '../entities/Hackathon';
import { HackathonStatus } from '../enums/HackathonStatus';
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

    // Lazy import to avoid circular dependency
    const { HackathonService } = await import('./hackathon.service');
    const hackathonService = new HackathonService();
    
    // Update hackathon status based on current dates before checking registration
    const updatedHackathon = await hackathonService.updateStatusIfNeeded(hackathon);

    // Check if hackathon is completed (can't register for completed hackathons)
    if (updatedHackathon.status === HackathonStatus.COMPLETED) {
      throw new Error('Cannot register for completed hackathon');
    }

    // Check if registration deadline has passed
    if (updatedHackathon.registrationDeadline && new Date() > updatedHackathon.registrationDeadline) {
      throw new Error('Registration deadline has passed');
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
      console.error('Failed to create registration notification:', error);
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

