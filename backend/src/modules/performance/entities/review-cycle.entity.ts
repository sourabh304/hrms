import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

export enum CycleType {
  ANNUAL = 'ANNUAL',
  HALF_YEARLY = 'HALF_YEARLY',
  QUARTERLY = 'QUARTERLY',
}

export enum CycleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CALIBRATION = 'CALIBRATION',
  CLOSED = 'CLOSED',
}

@Entity('review_cycles')
export class ReviewCycle extends AppBaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'simple-enum', enum: CycleType, default: CycleType.HALF_YEARLY })
  type: CycleType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'date' })
  selfReviewDue: string;

  @Column({ type: 'date' })
  managerReviewDue: string;

  @Column({ type: 'simple-enum', enum: CycleStatus, default: CycleStatus.DRAFT })
  status: CycleStatus;

  /** Competencies rated in every review of this cycle. */
  @Column({ type: 'simple-json' })
  competencies: string[];
}
