import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { JourneyType } from './journey-template.entity.js';
import { JourneyTask } from './journey-task.entity.js';

export enum JourneyStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('journeys')
export class Journey extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: 'simple-enum', enum: JourneyType })
  type: JourneyType;

  @Column({ type: 'varchar', length: 120 })
  templateName: string;

  /** Joining date (onboarding) or last working day (offboarding). */
  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'simple-enum', enum: JourneyStatus, default: JourneyStatus.IN_PROGRESS })
  status: JourneyStatus;

  @Column({ type: Date, nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  separationId: string | null;

  @OneToMany(() => JourneyTask, (t) => t.journey, { cascade: true })
  tasks: Relation<JourneyTask>[];
}
