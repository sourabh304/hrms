import { AfterLoad, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { daysColumn, LeaveType } from './leave-type.entity.js';

@Entity('leave_balances')
@Index(['employeeId', 'leaveTypeId', 'year'], { unique: true })
export class LeaveBalance extends AppBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'uuid' })
  leaveTypeId: string;

  @ManyToOne(() => LeaveType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType: Relation<LeaveType>;

  @Column({ type: 'int' })
  year: number;

  @Column(daysColumn)
  allocated: number;

  @Column(daysColumn)
  carriedForward: number;

  @Column(daysColumn)
  used: number;

  /** Days in requests awaiting approval. */
  @Column(daysColumn)
  pending: number;

  available: number;

  @AfterLoad()
  protected computeAvailable() {
    this.available = Math.round((this.allocated + this.carriedForward - this.used - this.pending) * 10) / 10;
  }
}
