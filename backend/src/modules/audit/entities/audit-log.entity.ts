import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only record of every state-changing API call. */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  userEmail: string | null;

  @Column({ type: 'varchar', length: 40 })
  action: string;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  resource: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 300 })
  path: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'varchar', length: 60, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> | null;
}
