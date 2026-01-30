import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { ProjectStatus } from '../enums/ProjectStatus';
import { BaseEntityWithUpdate } from './BaseEntity';
import { Idea } from './Idea';
import { User } from './User';

@Entity('projects')
@Index(['ideaId'])
@Index(['userId'])
@Index(['status'])
export class Project extends BaseEntityWithUpdate {
  @Column()
  ideaId: string;

  @ManyToOne(() => Idea)
  @JoinColumn({ name: 'ideaId' })
  idea: Idea;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.NOT_SUBMITTED
  })
  status: ProjectStatus;

  // Project submission fields
  @Column({ nullable: true })
  githubUrl?: string;

  @Column({ nullable: true })
  demoVideoUrl?: string;

  @Column({ nullable: true })
  documentationUrl?: string;

  @Column({ nullable: true })
  zipFilePath?: string;

  // Pitching phase fields
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
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;
}

