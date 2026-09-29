import { Column, Entity } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum CourseFormat {
  VIDEO = 'VIDEO',
  CLASSROOM = 'CLASSROOM',
  WEBINAR = 'WEBINAR',
  DOCUMENT = 'DOCUMENT',
  INTERACTIVE = 'INTERACTIVE',
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('courses')
export class Course extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  provider: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 1, transformer: decimalTransformer })
  durationHours: number;

  @Column({ type: 'simple-enum', enum: CourseLevel, default: CourseLevel.BEGINNER })
  level: CourseLevel;

  @Column({ type: 'simple-enum', enum: CourseFormat, default: CourseFormat.VIDEO })
  format: CourseFormat;

  @Column({ type: 'varchar', length: 400, nullable: true })
  contentUrl: string | null;

  /** Compliance training everyone must complete. */
  @Column({ type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ type: 'simple-json', nullable: true })
  skills: string[] | null;

  @Column({ type: 'simple-enum', enum: CourseStatus, default: CourseStatus.PUBLISHED })
  status: CourseStatus;
}
