import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity, moneyColumn } from '../../../common/entities/base.entity.js';

export enum PayrollRunStatus {
  DRAFT = 'DRAFT',
  PROCESSED = 'PROCESSED',
  PAID = 'PAID',
}

@Entity('payroll_runs')
@Index(['year', 'month'], { unique: true })
export class PayrollRun extends AppBaseEntity {
  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'simple-enum', enum: PayrollRunStatus, default: PayrollRunStatus.DRAFT })
  status: PayrollRunStatus;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'int', default: 0 })
  employeeCount: number;

  @Column(moneyColumn)
  totalGross: number;

  @Column(moneyColumn)
  totalDeductions: number;

  @Column(moneyColumn)
  totalNet: number;

  @Column({ type: Date, nullable: true })
  processedAt: Date | null;

  @Column({ type: Date, nullable: true })
  paidAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  processedById: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
