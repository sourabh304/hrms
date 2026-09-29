import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity, decimalTransformer } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

export enum AssetCategory {
  LAPTOP = 'LAPTOP',
  DESKTOP = 'DESKTOP',
  MONITOR = 'MONITOR',
  PHONE = 'PHONE',
  TABLET = 'TABLET',
  PERIPHERAL = 'PERIPHERAL',
  ACCESS_CARD = 'ACCESS_CARD',
  FURNITURE = 'FURNITURE',
  SOFTWARE_LICENSE = 'SOFTWARE_LICENSE',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_REPAIR = 'IN_REPAIR',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
}

export enum AssetCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

@Entity('assets')
export class Asset extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  assetTag: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'simple-enum', enum: AssetCategory })
  category: AssetCategory;

  @Column({ type: 'varchar', length: 80, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  serialNumber: string | null;

  @Column({ type: 'date', nullable: true })
  purchaseDate: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, transformer: decimalTransformer })
  purchaseCost: number | null;

  @Column({ type: 'date', nullable: true })
  warrantyUntil: string | null;

  @Index()
  @Column({ type: 'simple-enum', enum: AssetStatus, default: AssetStatus.AVAILABLE })
  status: AssetStatus;

  @Column({ type: 'simple-enum', enum: AssetCondition, default: AssetCondition.NEW })
  condition: AssetCondition;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: Relation<Employee> | null;

  @Column({ type: Date, nullable: true })
  assignedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
