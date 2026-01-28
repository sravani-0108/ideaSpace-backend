import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn
} from 'typeorm';

/**
 * Base entity class to remove code duplication
 * All entities extend this to get common fields
 */
export abstract class BaseEntity {
  @Column({ type: 'uuid', primary: true, default: () => 'gen_random_uuid()' })
  id: string;

  @CreateDateColumn()
  createdAt: Date;
}

/**
 * Base entity with update timestamp
 * Use for entities that need to track updates
 */
export abstract class BaseEntityWithUpdate extends BaseEntity {
  @UpdateDateColumn()
  updatedAt: Date;
}

