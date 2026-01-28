import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany
} from 'typeorm';
import { UserRole } from '../enums/UserRole';
import { BaseEntityWithUpdate } from './BaseEntity';
import { EmailVerification } from './EmailVerification';
import { Idea } from './Idea';
import { Comment } from './Comment';
import { Like } from './Like';
import { Notification } from './Notification';

@Entity('users')
@Index(['role']) // Index for admin queries
export class User extends BaseEntityWithUpdate {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: '' })
  firstName: string;

  @Column({ default: '' })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  // Relations
  @OneToOne(() => EmailVerification, verification => verification.user, { cascade: true })
  emailVerification: EmailVerification;

  @OneToMany(() => Idea, idea => idea.user)
  ideas: Idea[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @OneToMany(() => Like, like => like.user)
  likes: Like[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];
}

