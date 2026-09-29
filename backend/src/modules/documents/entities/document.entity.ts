import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { StoredFile } from './stored-file.entity.js';

export enum DocumentCategory {
  POLICY = 'POLICY',
  HANDBOOK = 'HANDBOOK',
  FORM = 'FORM',
  COMPLIANCE = 'COMPLIANCE',
  CONTRACT = 'CONTRACT',
  LETTER = 'LETTER',
  ID_PROOF = 'ID_PROOF',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}

/** A company document (policy library) or an employee's personal document. */
@Entity('documents')
export class Document extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'simple-enum', enum: DocumentCategory, default: DocumentCategory.OTHER })
  category: DocumentCategory;

  /** Inline body for policies authored in the app. */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => StoredFile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fileId' })
  file: Relation<StoredFile> | null;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @Column({ type: 'boolean', default: false })
  requiresAcknowledgment: boolean;

  /** Set for personal documents; null for company-wide documents. */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee> | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;

  @Column({ type: 'date', nullable: true })
  expiresOn: string | null;
}
