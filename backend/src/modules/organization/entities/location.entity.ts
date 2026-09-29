import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

/** An office / work site. */
@Entity('locations')
export class Location extends AppBaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 80 })
  city: string;

  @Column({ type: 'varchar', length: 80 })
  country: string;

  @Column({ type: 'varchar', length: 60, default: 'UTC' })
  timezone: string;

  @Column({ type: 'boolean', default: false })
  isHeadquarters: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
