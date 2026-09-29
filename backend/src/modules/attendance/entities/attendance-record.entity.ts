import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  HALF_DAY = 'HALF_DAY',
  ABSENT = 'ABSENT',
}

export enum AttendanceSource {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  BIOMETRIC = 'BIOMETRIC',
  REGULARIZED = 'REGULARIZED',
  SYSTEM = 'SYSTEM',
}

@Entity('attendance_records')
@Index(['employeeId', 'date'], { unique: true })
export class AttendanceRecord extends AppBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: Date, nullable: true })
  checkIn: Date | null;

  @Column({ type: Date, nullable: true })
  checkOut: Date | null;

  @Column({ type: 'int', default: 0 })
  workMinutes: number;

  @Column({ type: 'simple-enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'boolean', default: false })
  isLate: boolean;

  @Column({ type: 'int', default: 0 })
  lateMinutes: number;

  @Column({ type: 'simple-enum', enum: AttendanceSource, default: AttendanceSource.WEB })
  source: AttendanceSource;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string | null;
}
