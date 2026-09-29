import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';
import { Employee, EmploymentType, WorkMode } from '../../employees/entities/employee.entity.js';
import { Department } from '../../organization/entities/department.entity.js';
import { Designation } from '../../organization/entities/designation.entity.js';
import { Location } from '../../organization/entities/location.entity.js';

export enum JobStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  OPEN = 'OPEN',
  ON_HOLD = 'ON_HOLD',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/** A job requisition / opening. */
@Entity('job_openings')
export class JobOpening extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  department: Relation<Department> | null;

  @Column({ type: 'uuid', nullable: true })
  designationId: string | null;

  @ManyToOne(() => Designation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'designationId' })
  designation: Relation<Designation> | null;

  @Column({ type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location: Relation<Location> | null;

  @Column({ type: 'simple-enum', enum: EmploymentType, default: EmploymentType.FULL_TIME })
  employmentType: EmploymentType;

  @Column({ type: 'simple-enum', enum: WorkMode, default: WorkMode.HYBRID })
  workMode: WorkMode;

  @Column({ type: 'int', default: 1 })
  openings: number;

  @Column({ type: 'int', default: 0 })
  filled: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  requirements: string | null;

  @Column({ type: 'simple-json', nullable: true })
  skills: string[] | null;

  @Column({ type: 'int', default: 0 })
  experienceMin: number;

  @Column({ type: 'int', nullable: true })
  experienceMax: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalTransformer })
  salaryMin: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalTransformer })
  salaryMax: number | null;

  @Index()
  @Column({ type: 'simple-enum', enum: JobStatus, default: JobStatus.DRAFT })
  status: JobStatus;

  /** Visible on the public careers site. */
  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'uuid', nullable: true })
  hiringManagerId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hiringManagerId' })
  hiringManager: Relation<Employee> | null;

  @Column({ type: 'uuid', nullable: true })
  recruiterId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recruiterId' })
  recruiter: Relation<Employee> | null;

  @Column({ type: Date, nullable: true })
  postedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  closingDate: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvalRequestId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;
}
