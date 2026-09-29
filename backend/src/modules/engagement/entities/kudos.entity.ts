import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum KudosBadge {
  TEAM_PLAYER = 'TEAM_PLAYER',
  INNOVATOR = 'INNOVATOR',
  CUSTOMER_HERO = 'CUSTOMER_HERO',
  LEADERSHIP = 'LEADERSHIP',
  ABOVE_AND_BEYOND = 'ABOVE_AND_BEYOND',
  MENTOR = 'MENTOR',
}

/** Public peer recognition. */
@Entity('kudos')
export class Kudos extends AppBaseEntity {
  @Column({ type: 'uuid' })
  fromId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromId' })
  from: Relation<Employee>;

  @Index()
  @Column({ type: 'uuid' })
  toId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toId' })
  to: Relation<Employee>;

  @Column({ type: 'simple-enum', enum: KudosBadge })
  badge: KudosBadge;

  @Column({ type: 'text' })
  message: string;

  /** Employee ids who liked this kudos. */
  @Column({ type: 'simple-json' })
  likes: string[];
}
