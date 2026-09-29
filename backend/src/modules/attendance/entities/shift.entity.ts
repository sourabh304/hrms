import { Column, Entity, Index } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';

@Entity('shifts')
export class Shift extends AppBaseEntity {
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  /** `HH:mm` local time. */
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'int', default: 15 })
  graceMinutes: number;

  @Column({ type: 'int', default: 60 })
  breakMinutes: number;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;
}
