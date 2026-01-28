import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique
} from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Hackathon } from './Hackathon';

@Entity('hackathon_registrations')
@Unique(['hackathonId', 'userId'])
@Index(['hackathonId'])
@Index(['userId'])
export class HackathonRegistration extends BaseEntity {
  @Column()
  hackathonId: string;

  @ManyToOne(() => Hackathon)
  @JoinColumn({ name: 'hackathonId' })
  hackathon: Hackathon;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  teamId?: string;
}

