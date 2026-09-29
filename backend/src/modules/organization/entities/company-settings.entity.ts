import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import type { Weekday } from '../../../common/utils/dates.js';

export interface TaxSlab {
  /** Annual taxable income lower bound (inclusive). */
  from: number;
  /** Upper bound (exclusive); null = no upper bound. */
  to: number | null;
  ratePercent: number;
}

/** Tenant-wide configuration (singleton row). */
@Entity('company_settings')
export class CompanySettings extends AppBaseEntity {
  @Column({ type: 'varchar', length: 160 })
  companyName: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  legalName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 60, default: 'UTC' })
  timezone: string;

  @Column({ type: 'varchar', length: 20, default: 'MMM d, yyyy' })
  dateFormat: string;

  /** 1 = January. */
  @Column({ type: 'int', default: 1 })
  fiscalYearStartMonth: number;

  @Column({ type: 'simple-array' })
  weeklyOffs: Weekday[];

  @Column({ type: 'int', default: 8 })
  standardWorkHours: number;

  @Column({ type: 'int', default: 90 })
  probationDays: number;

  @Column({ type: 'int', default: 30 })
  noticePeriodDays: number;

  @Column({ type: 'simple-json' })
  taxSlabs: TaxSlab[];

  @Column({ type: 'varchar', length: 10, default: 'SEG' })
  employeeCodePrefix: string;

  /** Domain used to generate work emails for new hires. */
  @Column({ type: 'varchar', length: 120, default: 'segueit.com' })
  emailDomain: string;
}
