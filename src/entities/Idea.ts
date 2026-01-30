import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { IdeaStatus } from '../enums/IdeaStatus';
import { BaseEntityWithUpdate } from './BaseEntity';
import { User } from './User';
import { Comment } from './Comment';
import { Like } from './Like';
import { Notification } from './Notification';

@Entity('ideas')
@Index(['userId']) // Index for user's ideas query
@Index(['status']) // Index for filtering by status
@Index(['createdAt']) // Index for sorting
export class Idea extends BaseEntityWithUpdate {
  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.ideas)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: IdeaStatus,
    default: IdeaStatus.PENDING
  })
  status: IdeaStatus;

  // Link idea to hackathon (for Hands-On hackathons)
  @Column({ nullable: true })
  hackathonId?: string;

  @ManyToOne(() => {
    const { Hackathon } = require('./Hackathon');
    return Hackathon;
  }, { nullable: true })
  @JoinColumn({ name: 'hackathonId' })
  hackathon?: any;

  @Column({ nullable: true })
  approvedBy?: string;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  projectDeadline?: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approvedByUser?: User;

  // Relations
  @OneToMany(() => Comment, comment => comment.idea, { cascade: true })
  comments: Comment[];

  @OneToMany(() => Like, like => like.idea, { cascade: true })
  likes: Like[];

  @OneToMany(() => Notification, notification => notification.idea, { cascade: true })
  notifications: Notification[];
}

