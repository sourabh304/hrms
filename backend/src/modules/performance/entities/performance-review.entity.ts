import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { ReviewCycle } from './review-cycle.entity.js';

export enum ReviewStatus {
  SELF_REVIEW = 'SELF_REVIEW',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  COMPLETED = 'COMPLETED',
}

export interface CompetencyRating {
  name: string;
  self: number | null;
  manager: number | null;
}

@Entity('performance_reviews')
@Index(['cycleId', 'employeeId'], { unique: true })
export class PerformanceReview extends AppBaseEntity {
  @Column({ type: 'uuid' })
  cycleId: string;

  @ManyToOne(() => ReviewCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycleId' })
  cycle: Relation<ReviewCycle>;

  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  reviewerId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: Relation<Employee> | null;

  @Column({ type: 'simple-enum', enum: ReviewStatus, default: ReviewStatus.SELF_REVIEW })
  status: ReviewStatus;

  @Column({ type: 'simple-json' })
  competencies: CompetencyRating[];

  @Column({ type: 'int', nullable: true })
  selfRating: number | null;

  @Column({ type: 'text', nullable: true })
  selfComments: string | null;

  @Column({ type: 'int', nullable: true })
  managerRating: number | null;

  @Column({ type: 'text', nullable: true })
  managerComments: string | null;

  @Column({ type: 'text', nullable: true })
  strengths: string | null;

  @Column({ type: 'text', nullable: true })
  improvements: string | null;

  /** Post-calibration rating (1–5). */
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, transformer: decimalTransformer })
  finalRating: number | null;

  @Column({ type: Date, nullable: true })
  selfSubmittedAt: Date | null;

  @Column({ type: Date, nullable: true })
  managerSubmittedAt: Date | null;
}
