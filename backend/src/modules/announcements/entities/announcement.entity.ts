import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { Department } from '../../organization/entities/department.entity.js';

export enum AnnouncementCategory {
  GENERAL = 'GENERAL',
  POLICY = 'POLICY',
  EVENT = 'EVENT',
  CELEBRATION = 'CELEBRATION',
  URGENT = 'URGENT',
}

@Entity('announcements')
export class Announcement extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-enum', enum: AnnouncementCategory, default: AnnouncementCategory.GENERAL })
  category: AnnouncementCategory;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Index()
  @Column({ type: Date })
  publishedAt: Date;

  @Column({ type: 'date', nullable: true })
  expiresOn: string | null;

  /** Restrict to one department; null = whole company. */
  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  department: Relation<Department> | null;

  @Column({ type: 'uuid', nullable: true })
  authorId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: Relation<Employee> | null;
}
