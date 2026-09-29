import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Location } from '../../organization/entities/location.entity.js';

export enum HolidayType {
  PUBLIC = 'PUBLIC',
  COMPANY = 'COMPANY',
  /** Floating holiday — employees may choose to take it; not a non-working day. */
  OPTIONAL = 'OPTIONAL',
}

@Entity('holidays')
export class Holiday extends AppBaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'simple-enum', enum: HolidayType, default: HolidayType.PUBLIC })
  type: HolidayType;

  /** Null = applies to every location. */
  @Column({ type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: Relation<Location> | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
