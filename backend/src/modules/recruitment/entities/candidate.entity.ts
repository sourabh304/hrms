import { AfterLoad, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum CandidateSource {
  CAREERS_SITE = 'CAREERS_SITE',
  REFERRAL = 'REFERRAL',
  LINKEDIN = 'LINKEDIN',
  JOB_BOARD = 'JOB_BOARD',
  AGENCY = 'AGENCY',
  CAMPUS = 'CAMPUS',
  DIRECT = 'DIRECT',
}

@Entity('candidates')
export class Candidate extends AppBaseEntity {
  @Column({ type: 'varchar', length: 80 })
  firstName: string;

  @Column({ type: 'varchar', length: 80 })
  lastName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  currentCompany: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  currentTitle: string | null;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0, transformer: decimalTransformer })
  experienceYears: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ type: 'simple-enum', enum: CandidateSource, default: CandidateSource.DIRECT })
  source: CandidateSource;

  @Column({ type: 'varchar', length: 400, nullable: true })
  resumeUrl: string | null;

  @Column({ type: 'varchar', length: 400, nullable: true })
  linkedinUrl: string | null;

  @Column({ type: 'simple-json', nullable: true })
  skills: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  referredById: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referredById' })
  referredBy: Relation<Employee> | null;

  fullName: string;

  @AfterLoad()
  protected computeFullName() {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
}
