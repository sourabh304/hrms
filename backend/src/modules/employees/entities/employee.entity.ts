import { AfterLoad, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Department } from '../../organization/entities/department.entity.js';
import { Designation } from '../../organization/entities/designation.entity.js';
import { Location } from '../../organization/entities/location.entity.js';

export enum EmployeeStatus {
  ONBOARDING = 'ONBOARDING',
  PROBATION = 'PROBATION',
  ACTIVE = 'ACTIVE',
  NOTICE_PERIOD = 'NOTICE_PERIOD',
  EXITED = 'EXITED',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  UNDISCLOSED = 'UNDISCLOSED',
}

export enum WorkMode {
  ONSITE = 'ONSITE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

/** Statuses that count as "currently employed". */
export const EMPLOYED_STATUSES = [
  EmployeeStatus.ONBOARDING,
  EmployeeStatus.PROBATION,
  EmployeeStatus.ACTIVE,
  EmployeeStatus.NOTICE_PERIOD,
];

export interface PostalAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  routingCode?: string;
}

@Entity('employees')
export class Employee extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  employeeCode: string;

  // ── Personal ─────────────────────────────────────────
  @Column({ type: 'varchar', length: 80 })
  firstName: string;

  @Column({ type: 'varchar', length: 80 })
  lastName: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  preferredName: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  workEmail: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  personalEmail: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'simple-enum', enum: Gender, default: Gender.UNDISCLOSED })
  gender: Gender;

  @Column({ type: 'varchar', length: 30, nullable: true })
  maritalStatus: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  bloodGroup: string | null;

  @Column({ type: 'simple-json', nullable: true })
  address: PostalAddress | null;

  @Column({ type: 'simple-json', nullable: true })
  emergencyContact: EmergencyContact | null;

  @Column({ type: 'simple-json', nullable: true })
  bankDetails: BankDetails | null;

  @Column({ type: 'varchar', length: 400, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'simple-json', nullable: true })
  skills: string[] | null;

  // ── Job ──────────────────────────────────────────────
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

  @Index()
  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managerId' })
  manager: Relation<Employee> | null;

  /** Assigned work shift (falls back to the default shift when null). */
  @Column({ type: 'uuid', nullable: true })
  shiftId: string | null;

  @Column({ type: 'simple-enum', enum: EmploymentType, default: EmploymentType.FULL_TIME })
  employmentType: EmploymentType;

  @Index()
  @Column({ type: 'simple-enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ type: 'simple-enum', enum: WorkMode, default: WorkMode.ONSITE })
  workMode: WorkMode;

  @Column({ type: 'date' })
  dateOfJoining: string;

  @Column({ type: 'date', nullable: true })
  probationEndDate: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfExit: string | null;

  fullName: string;

  @AfterLoad()
  protected computeFullName() {
    this.fullName = `${this.preferredName || this.firstName} ${this.lastName}`.trim();
  }
}
