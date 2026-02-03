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
    enumName: 'idea_status_enum',
    default: IdeaStatus.PENDING
  })
  status: IdeaStatus;

  // Link idea to hackathon (for Hands-On hackathons)
  @Column({ type: 'uuid', nullable: true })
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

  // Status deadline for Hands-On hackathon ideas (for PITCHING, ENHANCEMENTS, IMPLEMENTATION)
  @Column({ type: 'timestamp', nullable: true })
  statusDeadline?: Date;

  // File uploads for Hands-On hackathon ideas
  @Column({ nullable: true })
  gitRepositoryUrl?: string;

  @Column({ nullable: true })
  documentationUrl?: string;

  @Column({ nullable: true })
  videoUrl?: string;

  @Column({ nullable: true })
  zipFilePath?: string;

  // Project submission fields (for ENHANCEMENTS and IMPLEMENTATION phases)
  @Column({ nullable: true })
  githubUrl?: string;

  @Column({ nullable: true })
  demoVideoUrl?: string;

  @Column('text', { nullable: true })
  projectDescription?: string;

  @Column('text', { nullable: true })
  implementationDetails?: string;

  @Column({ nullable: true })
  pitchVideoUrl?: string;

  @Column({ nullable: true })
  presentationUrl?: string;

  // Review fields
  @Column('text', { nullable: true })
  judgeFeedback?: string;

  @Column({ nullable: true })
  reviewedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

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

