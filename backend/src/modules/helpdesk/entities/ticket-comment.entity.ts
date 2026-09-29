import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/base.entity.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { Ticket } from './ticket.entity.js';

@Entity('ticket_comments')
export class TicketComment extends AppBaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (t) => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Relation<Ticket>;

  @Column({ type: 'uuid' })
  authorId: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: Relation<Employee>;

  @Column({ type: 'text' })
  message: string;

  /** Internal notes are visible to support staff only. */
  @Column({ type: 'boolean', default: false })
  isInternal: boolean;
}
