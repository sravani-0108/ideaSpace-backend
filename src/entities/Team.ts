import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { BaseEntityWithUpdate } from './BaseEntity';
import { User } from './User';
import { Hackathon } from './Hackathon';
import { HackathonRegistration } from './HackathonRegistration';

@Entity('teams')
@Index(['hackathonId'])
@Index(['createdBy'])
export class Team extends BaseEntityWithUpdate {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  hackathonId: string;

  @ManyToOne(() => Hackathon)
  @JoinColumn({ name: 'hackathonId' })
  hackathon: Hackathon;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => HackathonRegistration, registration => registration.hackathon)
  members: HackathonRegistration[];
}

