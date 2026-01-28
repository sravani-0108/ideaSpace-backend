import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { BaseEntityWithUpdate } from './BaseEntity';
import { Idea } from './Idea';
import { User } from './User';

@Entity('comments')
@Index(['ideaId']) // Index for fetching comments by idea
@Index(['userId']) // Index for user's comments
@Index(['parentId']) // Index for fetching replies
@Index(['ideaId', 'createdAt']) // Composite index for sorted comments by idea
export class Comment extends BaseEntityWithUpdate {
  @Column()
  ideaId: string;

  @ManyToOne(() => Idea, idea => idea.comments)
  @JoinColumn({ name: 'ideaId' })
  idea: Idea;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.comments)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text')
  content: string;

  // Self-referencing relationship for replies
  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => Comment, comment => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Comment;

  @OneToMany(() => Comment, comment => comment.parent)
  replies: Comment[];
}

