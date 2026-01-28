import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { HackathonStatus } from '../enums/HackathonStatus';
import { BaseEntityWithUpdate } from './BaseEntity';
import { User } from './User';

@Entity('hackathons')
@Index(['status'])
@Index(['startDate'])
@Index(['createdBy'])
export class Hackathon extends BaseEntityWithUpdate {
  @Column()
  title: string;

  @Column('text')
  purpose: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  registrationDeadline?: Date;

  @Column()
  location: string;

  @Column({ nullable: true })
  onlineLink?: string;

  @Column({
    type: 'enum',
    enum: HackathonStatus,
    default: HackathonStatus.PENDING
  })
  status: HackathonStatus;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;
}

