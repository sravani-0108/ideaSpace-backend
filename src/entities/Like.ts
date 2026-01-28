import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique
} from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Idea } from './Idea';
import { User } from './User';

@Entity('likes')
@Unique(['ideaId', 'userId']) // One like per user per idea
@Index(['ideaId']) // Index for idea's likes
@Index(['userId']) // Index for user's likes
export class Like extends BaseEntity {
  @Column()
  ideaId: string;

  @ManyToOne(() => Idea, idea => idea.likes)
  @JoinColumn({ name: 'ideaId' })
  idea: Idea;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.likes)
  @JoinColumn({ name: 'userId' })
  user: User;
}

