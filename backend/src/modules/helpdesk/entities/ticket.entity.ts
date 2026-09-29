import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { TicketComment } from './ticket-comment.entity.js';

export enum TicketCategory {
  PAYROLL = 'PAYROLL',
  LEAVE_ATTENDANCE = 'LEAVE_ATTENDANCE',
  BENEFITS = 'BENEFITS',
  POLICY = 'POLICY',
  IT_SUPPORT = 'IT_SUPPORT',
  FACILITIES = 'FACILITIES',
  DOCUMENTS = 'DOCUMENTS',
  GENERAL = 'GENERAL',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_ON_EMPLOYEE = 'WAITING_ON_EMPLOYEE',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/** Resolution SLA in hours per priority. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

@Entity('tickets')
export class Ticket extends AppBaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  ticketNumber: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-enum', enum: TicketCategory, default: TicketCategory.GENERAL })
  category: TicketCategory;

  @Column({ type: 'simple-enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Index()
  @Column({ type: 'simple-enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Index()
  @Column({ type: 'uuid' })
  raisedById: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'raisedById' })
  raisedBy: Relation<Employee>;

  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: Relation<Employee> | null;

  @Column({ type: Date })
  slaDueAt: Date;

  @Column({ type: Date, nullable: true })
  resolvedAt: Date | null;

  /** CSAT, 1–5, given by the requester after resolution. */
  @Column({ type: 'int', nullable: true })
  satisfaction: number | null;

  @OneToMany(() => TicketComment, (c) => c.ticket)
  comments: Relation<TicketComment>[];
}
