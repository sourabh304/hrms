import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { WorkflowType } from '../workflow.types.js';
import type { PolicyStep } from '../workflow.types.js';

/** Configurable approval chain for one business process. */
@Entity('workflow_policies')
export class WorkflowPolicy extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'simple-enum', enum: WorkflowType })
  type: WorkflowType;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-json' })
  steps: PolicyStep[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
