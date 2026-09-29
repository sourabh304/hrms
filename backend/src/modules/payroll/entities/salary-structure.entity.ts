import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, moneyColumn } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import type { SalaryComponent } from '../payroll.calculator.js';

/** An employee's compensation package. History is kept; one row is current. */
@Entity('salary_structures')
@Index(['employeeId', 'isCurrent'])
export class SalaryStructure extends AppBaseEntity {
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column(moneyColumn)
  annualCtc: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'simple-json' })
  components: SalaryComponent[];

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string | null;
}
