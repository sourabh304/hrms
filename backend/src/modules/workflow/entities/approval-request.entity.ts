import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { RequestStatus, WorkflowType } from '../workflow.types.js';
import { ApprovalStep } from './approval-step.entity.js';

@Entity('approval_requests')
@Index(['type', 'entityId'])
export class ApprovalRequest extends AppBaseEntity {
  @Column({ type: 'simple-enum', enum: WorkflowType })
  type: WorkflowType;

  /** Id of the feature record (leave request, expense claim, …). */
  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /** Facts approvers need at a glance; also evaluated by policy conditions. */
  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, string | number | boolean | null> | null;

  /** In-app route to the underlying record. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  link: string | null;

  @Index()
  @Column({ type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: Relation<Employee>;

  @Index()
  @Column({ type: 'simple-enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @Column({ type: 'int', default: 0 })
  currentStep: number;

  @Column({ type: Date, nullable: true })
  completedAt: Date | null;

  @OneToMany(() => ApprovalStep, (step) => step.request, { cascade: true })
  steps: Relation<ApprovalStep>[];
}
