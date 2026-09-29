import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { Role } from '../../../common/auth/roles.js';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';

/** A login identity. Linked 1:1 to an employee for self-service. */
@Entity('users')
export class User extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  email: string;

  @Column({ type: 'varchar', length: 200, select: false })
  passwordHash: string;

  @Column({ type: 'simple-array' })
  roles: Role[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ type: Date, nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  refreshTokenHash: string | null;

  @Index({ unique: true })
  @Column({ type: 'uuid', nullable: true })
  employeeId: string | null;

  @OneToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee: Relation<Employee> | null;
}
