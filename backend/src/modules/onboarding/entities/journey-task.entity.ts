import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { Role } from '../../../common/auth/roles.js';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { Journey } from './journey.entity.js';

export enum TaskStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  SKIPPED = 'SKIPPED',
}

@Entity('journey_tasks')
export class JourneyTask extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  journeyId: string;

  @ManyToOne(() => Journey, (j) => j.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'journeyId' })
  journey: Relation<Journey>;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 60 })
  category: string;

  @Column({ type: 'varchar', length: 20 })
  assigneeType: string;

  @Column({ type: 'uuid', nullable: true })
  assigneeEmployeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeEmployeeId' })
  assigneeEmployee: Relation<Employee> | null;

  @Column({ type: 'simple-enum', enum: Role, nullable: true })
  assigneeRole: Role | null;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'simple-enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: Date, nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  completedById: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
