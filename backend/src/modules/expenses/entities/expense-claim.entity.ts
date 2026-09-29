import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, moneyColumn } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum ExpenseCategory {
  TRAVEL = 'TRAVEL',
  ACCOMMODATION = 'ACCOMMODATION',
  MEALS = 'MEALS',
  CLIENT_ENTERTAINMENT = 'CLIENT_ENTERTAINMENT',
  EQUIPMENT = 'EQUIPMENT',
  SOFTWARE = 'SOFTWARE',
  TRAINING = 'TRAINING',
  INTERNET_PHONE = 'INTERNET_PHONE',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED',
  CANCELLED = 'CANCELLED',
}

@Entity('expense_claims')
export class ExpenseClaim extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  claimNumber: string;

  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'simple-enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column(moneyColumn)
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'date' })
  expenseDate: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  merchant: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  receiptFileId: string | null;

  @Index()
  @Column({ type: 'simple-enum', enum: ExpenseStatus, default: ExpenseStatus.DRAFT })
  status: ExpenseStatus;

  @Column({ type: 'uuid', nullable: true })
  approvalRequestId: string | null;

  @Column({ type: Date, nullable: true })
  submittedAt: Date | null;

  @Column({ type: Date, nullable: true })
  reimbursedAt: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;
}
