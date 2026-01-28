import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { BaseEntityWithUpdate } from './BaseEntity';
import { User } from './User';
import { Hackathon } from './Hackathon';
import { Team } from './Team';

@Entity('meetings')
@Index(['hackathonId'])
@Index(['teamId'])
@Index(['scheduledDate'])
export class Meeting extends BaseEntityWithUpdate {
  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  scheduledDate: Date;

  @Column({ nullable: true })
  meetingLink: string;

  @Column()
  hackathonId: string;

  @ManyToOne(() => Hackathon)
  @JoinColumn({ name: 'hackathonId' })
  hackathon: Hackathon;

  @Column({ nullable: true })
  teamId?: string;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;
}

