import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';
import { NotificationType } from '../enums/NotificationType';

export class NotificationService {
  private notificationRepository = AppDataSource.getRepository(Notification);

  async createNotification(
    userId: string,
    ideaId: string,
    type: NotificationType
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      ideaId,
      type,
      isRead: false,
    });

    return await this.notificationRepository.save(notification);
  }

  async createHackathonReminder(
    userId: string,
    hackathonId: string
  ): Promise<Notification | null> {
    // Check if user already has ANY reminder (read or unread) for this hackathon
    // This prevents duplicate notifications even if the user has read the previous reminder
    const existingReminder = await this.notificationRepository.findOne({
      where: {
        userId,
        hackathonId,
        type: NotificationType.HACKATHON_REMINDER,
      },
    });

    // If reminder already exists (read or unread), return null (don't create duplicate)
    if (existingReminder) {
      return null;
    }

    // Create new reminder notification
    const notification = this.notificationRepository.create({
      userId,
      hackathonId,
      type: NotificationType.HACKATHON_REMINDER,
      isRead: false,
    });

    return await this.notificationRepository.save(notification);
  }

  async createHackathonRegistrationNotification(
    userId: string,
    hackathonId: string
  ): Promise<Notification> {
    // Create registration success notification
    const notification = this.notificationRepository.create({
      userId,
      hackathonId,
      type: NotificationType.HACKATHON_REGISTRATION,
      isRead: false,
    });

    return await this.notificationRepository.save(notification);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { userId },
      relations: ['idea', 'hackathon'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true }
    );
  }
}

