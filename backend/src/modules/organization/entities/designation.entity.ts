import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

/** A job title / position profile with its grade level. */
@Entity('designations')
export class Designation extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  title: string;

  /** Career level, e.g. L1 (entry) … L9 (executive). */
  @Column({ type: 'varchar', length: 10 })
  level: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  jobFamily: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
