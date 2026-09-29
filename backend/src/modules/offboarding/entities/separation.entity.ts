import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum SeparationType {
  RESIGNATION = 'RESIGNATION',
  TERMINATION = 'TERMINATION',
  RETIREMENT = 'RETIREMENT',
  END_OF_CONTRACT = 'END_OF_CONTRACT',
}

export enum SeparationStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  COMPLETED = 'COMPLETED',
}

export interface ExitInterview {
  overallRating: number;
  primaryReason: string;
  wouldRecommend: boolean;
  feedback: string;
  submittedAt: string;
}

@Entity('separations')
export class Separation extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'simple-enum', enum: SeparationType })
  type: SeparationType;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'date' })
  noticeDate: string;

  @Column({ type: 'date' })
  requestedLastDay: string;

  @Column({ type: 'date', nullable: true })
  approvedLastDay: string | null;

  @Index()
  @Column({ type: 'simple-enum', enum: SeparationStatus, default: SeparationStatus.PENDING_APPROVAL })
  status: SeparationStatus;

  @Column({ type: 'simple-json', nullable: true })
  exitInterview: ExitInterview | null;

  @Column({ type: 'boolean', nullable: true })
  isRehireEligible: boolean | null;

  @Column({ type: 'uuid', nullable: true })
  initiatedById: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvalRequestId: string | null;

  @Column({ type: Date, nullable: true })
  completedAt: Date | null;
}
