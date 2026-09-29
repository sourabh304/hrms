import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, decimalTransformer, moneyColumn } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import type { PayLine } from '../payroll.calculator.js';
import { PayrollRun } from './payroll-run.entity.js';

@Entity('payslips')
@Index(['payrollRunId', 'employeeId'], { unique: true })
export class Payslip extends AppBaseEntity {
  @Column({ type: 'uuid' })
  payrollRunId: string;

  @ManyToOne(() => PayrollRun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payrollRunId' })
  payrollRun: Relation<PayrollRun>;

  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  workingDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, transformer: decimalTransformer })
  paidDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0, transformer: decimalTransformer })
  lopDays: number;

  @Column(moneyColumn)
  annualCtc: number;

  @Column({ type: 'simple-json' })
  earnings: PayLine[];

  @Column({ type: 'simple-json' })
  deductions: PayLine[];

  @Column(moneyColumn)
  gross: number;

  @Column(moneyColumn)
  totalDeductions: number;

  @Column(moneyColumn)
  net: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /** Employees only see payslips once the run is paid. */
  @Column({ type: 'boolean', default: false })
  isPublished: boolean;
}
