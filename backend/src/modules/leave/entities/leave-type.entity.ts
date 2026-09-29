import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';
import { Gender } from '../../employees/entities/employee.entity.js';

export const daysColumn = {
  type: 'decimal' as const,
  precision: 6,
  scale: 1,
  default: 0,
  transformer: decimalTransformer,
};

/** A leave policy (e.g. Annual, Sick, Parental, Unpaid). */
@Entity('leave_types')
export class LeaveType extends AppBaseEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 9, default: '#6366f1' })
  color: string;

  /** Days granted per year. Ignored for unpaid leave. */
  @Column(daysColumn)
  annualQuota: number;

  @Column({ type: 'boolean', default: true })
  isPaid: boolean;

  @Column({ type: 'boolean', default: false })
  carryForward: boolean;

  @Column(daysColumn)
  maxCarryForward: number;

  @Column({ type: 'boolean', default: true })
  allowHalfDay: boolean;

  @Column({ type: 'int', nullable: true })
  maxConsecutiveDays: number | null;

  /** Restrict to one gender (e.g. maternity); null = everyone. */
  @Column({ type: 'simple-enum', enum: Gender, nullable: true })
  applicableGender: Gender | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
