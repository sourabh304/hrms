import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { Document } from './document.entity.js';

@Entity('document_acknowledgments')
@Index(['documentId', 'employeeId', 'version'], { unique: true })
export class DocumentAcknowledgment extends AppBaseEntity {
  @Column({ type: 'uuid' })
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Relation<Document>;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  /** Acknowledgments are per document version. */
  @Column({ type: 'varchar', length: 20 })
  version: string;
}
