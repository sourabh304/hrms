import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum FeedbackType {
  PRAISE = 'PRAISE',
  CONSTRUCTIVE = 'CONSTRUCTIVE',
}

export enum FeedbackVisibility {
  PRIVATE = 'PRIVATE',
  SHARED_WITH_MANAGER = 'SHARED_WITH_MANAGER',
}

/** Continuous 1:1 feedback between colleagues. */
@Entity('feedback')
export class Feedback extends AppBaseEntity {
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

  @Column({ type: 'simple-enum', enum: FeedbackType, default: FeedbackType.PRAISE })
  type: FeedbackType;

  @Column({ type: 'simple-enum', enum: FeedbackVisibility, default: FeedbackVisibility.SHARED_WITH_MANAGER })
  visibility: FeedbackVisibility;

  @Column({ type: 'text' })
  message: string;
}
