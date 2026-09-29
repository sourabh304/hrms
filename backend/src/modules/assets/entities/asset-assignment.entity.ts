import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { Asset, AssetCondition } from './asset.entity.js';

/** Custody history of an asset. */
@Entity('asset_assignments')
export class AssetAssignment extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  assetId: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Relation<Asset>;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee>;

  @Column({ type: Date })
  assignedAt: Date;

  @Column({ type: Date, nullable: true })
  returnedAt: Date | null;

  @Column({ type: 'simple-enum', enum: AssetCondition, nullable: true })
  conditionOnReturn: AssetCondition | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedById: string | null;
}
