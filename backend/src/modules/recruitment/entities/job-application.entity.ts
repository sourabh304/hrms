import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';
import { Candidate } from './candidate.entity.js';
import { Interview } from './interview.entity.js';
import { JobOpening } from './job-opening.entity.js';

export enum ApplicationStage {
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  INTERVIEW = 'INTERVIEW',
  OFFER = 'OFFER',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export const ACTIVE_STAGES = [
  ApplicationStage.APPLIED,
  ApplicationStage.SCREENING,
  ApplicationStage.INTERVIEW,
  ApplicationStage.OFFER,
];

@Entity('job_applications')
@Index(['jobId', 'candidateId'], { unique: true })
export class JobApplication extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobOpening, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Relation<JobOpening>;

  @Column({ type: 'uuid' })
  candidateId: string;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: Relation<Candidate>;

  @Index()
  @Column({ type: 'simple-enum', enum: ApplicationStage, default: ApplicationStage.APPLIED })
  stage: ApplicationStage;

  /** Recruiter's overall score, 1–5. */
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: Date })
  appliedAt: Date;

  @Column({ type: Date })
  stageChangedAt: Date;

  @Column({ type: 'text', nullable: true })
  coverLetter: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalTransformer })
  offeredSalary: number | null;

  @Column({ type: 'uuid', nullable: true })
  hiredEmployeeId: string | null;

  @OneToMany(() => Interview, (i) => i.application)
  interviews: Relation<Interview>[];
}
