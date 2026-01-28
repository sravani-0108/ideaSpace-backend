import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index
} from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Idea } from './Idea';

@Entity('saved_ideas')
@Unique(['userId', 'ideaId'])
@Index(['userId'])
@Index(['ideaId'])
export class SavedIdea extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  ideaId: string;

  @ManyToOne(() => Idea)
  @JoinColumn({ name: 'ideaId' })
  idea: Idea;
}

