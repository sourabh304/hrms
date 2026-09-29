import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { Role } from '../../../common/auth/roles.js';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { ApproverType, StepStatus } from '../workflow.types.js';
import { ApprovalRequest } from './approval-request.entity.js';

@Entity('approval_steps')
@Index(['status', 'approverEmployeeId'])
export class ApprovalStep extends AppBaseEntity {
  @Column({ type: 'uuid' })
  requestId: string;

  @ManyToOne(() => ApprovalRequest, (r) => r.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: Relation<ApprovalRequest>;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'simple-enum', enum: ApproverType })
  approverType: ApproverType;

  @Column({ type: 'uuid', nullable: true })
  approverEmployeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approverEmployeeId' })
  approverEmployee: Relation<Employee> | null;

  @Column({ type: 'simple-enum', enum: Role, nullable: true })
  approverRole: Role | null;

  @Column({ type: 'simple-enum', enum: StepStatus, default: StepStatus.WAITING })
  status: StepStatus;

  @Column({ type: 'uuid', nullable: true })
  actedById: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actedById' })
  actedBy: Relation<Employee> | null;

  @Column({ type: Date, nullable: true })
  actedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;
}
