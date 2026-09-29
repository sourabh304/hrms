import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Department } from '../../organization/entities/department.entity.js';

export enum SurveyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export type QuestionType = 'RATING' | 'ENPS' | 'TEXT' | 'CHOICE';

export interface SurveyQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
}

@Entity('surveys')
export class Survey extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-json' })
  questions: SurveyQuestion[];

  @Column({ type: 'simple-enum', enum: SurveyStatus, default: SurveyStatus.DRAFT })
  status: SurveyStatus;

  @Column({ type: 'boolean', default: true })
  isAnonymous: boolean;

  @Column({ type: 'date', nullable: true })
  closesOn: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;
}

@Entity('survey_responses')
@Index(['surveyId', 'respondentKey'], { unique: true })
export class SurveyResponse extends AppBaseEntity {
  @Column({ type: 'uuid' })
  surveyId: string;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey: Relation<Survey>;

  /** One-way hash of survey + employee: prevents double voting without identifying anonymous respondents. */
  @Column({ type: 'varchar', length: 64 })
  respondentKey: string;

  /** Only stored for non-anonymous surveys. */
  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;

  /** Kept for segmentation even when anonymous. */
  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  department: Relation<Department> | null;

  @Column({ type: 'simple-json' })
  answers: Record<string, string | number>;
}
