import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

export enum JourneyType {
  ONBOARDING = 'ONBOARDING',
  OFFBOARDING = 'OFFBOARDING',
}

export type TaskAssignee = 'HR' | 'IT' | 'FINANCE' | 'MANAGER' | 'EMPLOYEE';

export interface TemplateTask {
  title: string;
  description?: string;
  category: string;
  assignee: TaskAssignee;
  /** Days relative to the journey start date (negative = before). */
  dueOffsetDays: number;
}

/** Reusable checklist, e.g. "Engineering onboarding" or "Standard exit clearance". */
@Entity('journey_templates')
export class JourneyTemplate extends AppBaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'simple-enum', enum: JourneyType })
  type: JourneyType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'simple-json' })
  tasks: TemplateTask[];
}
