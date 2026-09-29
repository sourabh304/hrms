import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

export enum FileVisibility {
  /** Any signed-in employee (company policies, forms). */
  COMPANY = 'COMPANY',
  /** Uploader, the linked employee, their manager and admins. */
  PRIVATE = 'PRIVATE',
}

@Entity('stored_files')
export class StoredFile extends AppBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  /** Path relative to the upload directory. Never exposed to clients. */
  @Column({ type: 'varchar', length: 300, select: false })
  storagePath: string;

  @Column({ type: 'simple-enum', enum: FileVisibility, default: FileVisibility.PRIVATE })
  visibility: FileVisibility;

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;

  /** Employee the file is about (personal documents, receipts). */
  @Column({ type: 'uuid', nullable: true })
  linkedEmployeeId: string | null;
}
