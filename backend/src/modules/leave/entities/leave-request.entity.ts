import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { daysColumn, LeaveType } from './leave-type.entity.js';

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('leave_requests')
@Index(['employeeId', 'startDate'])
export class LeaveRequest extends AppBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'uuid' })
  leaveTypeId: string;

  @ManyToOne(() => LeaveType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: Relation<LeaveType>;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column(daysColumn)
  days: number;

  @Column({ type: 'boolean', default: false })
  isHalfDay: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  halfDaySession: 'FIRST' | 'SECOND' | null;

  @Column({ type: 'text' })
  reason: string;

  @Index()
  @Column({ type: 'simple-enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({ type: 'uuid', nullable: true })
  approvalRequestId: string | null;

  @Column({ type: Date, nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;
}
