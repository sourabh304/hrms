import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum RegularizationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** Request to correct a missed or wrong punch. */
@Entity('attendance_regularizations')
export class Regularization extends AppBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 5 })
  checkIn: string;

  @Column({ type: 'varchar', length: 5 })
  checkOut: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'simple-enum', enum: RegularizationStatus, default: RegularizationStatus.PENDING })
  status: RegularizationStatus;

  @Column({ type: 'uuid', nullable: true })
  approvalRequestId: string | null;
}
