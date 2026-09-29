import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { JobApplication } from './job-application.entity.js';

export enum InterviewMode {
  VIDEO = 'VIDEO',
  ONSITE = 'ONSITE',
  PHONE = 'PHONE',
}

export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum Recommendation {
  STRONG_HIRE = 'STRONG_HIRE',
  HIRE = 'HIRE',
  NO_HIRE = 'NO_HIRE',
  STRONG_NO_HIRE = 'STRONG_NO_HIRE',
}

@Entity('interviews')
export class Interview extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => JobApplication, (a) => a.interviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Relation<JobApplication>;

  @Index()
  @Column({ type: 'uuid' })
  interviewerId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewerId' })
  interviewer: Relation<Employee>;

  @Column({ type: 'varchar', length: 80 })
  round: string;

  @Column({ type: Date })
  scheduledAt: Date;

  @Column({ type: 'int', default: 45 })
  durationMinutes: number;

  @Column({ type: 'simple-enum', enum: InterviewMode, default: InterviewMode.VIDEO })
  mode: InterviewMode;

  @Column({ type: 'varchar', length: 400, nullable: true })
  meetingLink: string | null;

  @Column({ type: 'simple-enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
  status: InterviewStatus;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'simple-enum', enum: Recommendation, nullable: true })
  recommendation: Recommendation | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;
}
