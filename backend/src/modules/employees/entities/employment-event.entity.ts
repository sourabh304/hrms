import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from './employee.entity.js';

export enum EmploymentEventType {
  HIRE = 'HIRE',
  PROMOTION = 'PROMOTION',
  TRANSFER = 'TRANSFER',
  MANAGER_CHANGE = 'MANAGER_CHANGE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  COMPENSATION_CHANGE = 'COMPENSATION_CHANGE',
  EXIT = 'EXIT',
}

/** Immutable job-history timeline (hires, promotions, transfers, exits). */
@Entity('employment_events')
export class EmploymentEvent extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'simple-enum', enum: EmploymentEventType })
  type: EmploymentEventType;

  @Column({ type: 'date' })
  effectiveDate: string;

  @Column({ type: 'varchar', length: 300 })
  summary: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  recordedById: string | null;
}
