import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { NotificationType } from '../enums/NotificationType';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Idea } from './Idea';
import { Hackathon } from './Hackathon';

@Entity('notifications')
@Index(['userId']) // Index for user's notifications
@Index(['ideaId']) // Index for idea's notifications
@Index(['hackathonId']) // Index for hackathon's notifications
@Index(['userId', 'isRead']) // Composite index for unread notifications query
@Index(['createdAt']) // Index for sorting
export class Notification extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  ideaId?: string;

  @ManyToOne(() => Idea, idea => idea.notifications, { nullable: true })
  @JoinColumn({ name: 'ideaId' })
  idea?: Idea;

  @Column({ nullable: true })
  hackathonId?: string;

  @ManyToOne(() => Hackathon, { nullable: true })
  @JoinColumn({ name: 'hackathonId' })
  hackathon?: Hackathon;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType;

  @Column({ default: false })
  isRead: boolean;
}

