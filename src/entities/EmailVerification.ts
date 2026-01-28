import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn
} from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';

@Entity('email_verifications')
@Index(['userId']) // Index for user lookup
@Index(['expiresAt']) // Index for cleanup queries
export class EmailVerification extends BaseEntity {
  @Column({ unique: true }) // One active verification per user
  userId: string;

  @OneToOne(() => User, user => user.emailVerification)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  otp: string;

  @Column()
  expiresAt: Date;
}

