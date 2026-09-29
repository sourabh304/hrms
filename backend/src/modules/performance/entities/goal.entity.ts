import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { ReviewCycle } from './review-cycle.entity.js';

export enum GoalCategory {
  INDIVIDUAL = 'INDIVIDUAL',
  TEAM = 'TEAM',
  COMPANY = 'COMPANY',
  DEVELOPMENT = 'DEVELOPMENT',
}

export enum GoalStatus {
  NOT_STARTED = 'NOT_STARTED',
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  OFF_TRACK = 'OFF_TRACK',
  COMPLETED = 'COMPLETED',
}

export interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
}

/** OKR-style goal. Company goals have no owner; others can align to a parent goal. */
@Entity('goals')
export class Goal extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee> | null;

  @Column({ type: 'uuid', nullable: true })
  cycleId: string | null;

  @ManyToOne(() => ReviewCycle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cycleId' })
  cycle: Relation<ReviewCycle> | null;

  @Column({ type: 'uuid', nullable: true })
  parentGoalId: string | null;

  @ManyToOne(() => Goal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentGoalId' })
  parentGoal: Relation<Goal> | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-enum', enum: GoalCategory, default: GoalCategory.INDIVIDUAL })
  category: GoalCategory;

  @Column({ type: 'simple-json' })
  keyResults: KeyResult[];

  /** Relative weight (%) in the owner's goal plan. */
  @Column({ type: 'int', default: 0 })
  weight: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'simple-enum', enum: GoalStatus, default: GoalStatus.NOT_STARTED })
  status: GoalStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;
}
