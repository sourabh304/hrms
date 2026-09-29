import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission, Role } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CommentDto, CreateTicketDto, TicketQueryDto, UpdateTicketDto } from './dto/helpdesk.dto.js';
import { TicketComment } from './entities/ticket-comment.entity.js';
import { SLA_HOURS, Ticket, TicketCategory, TicketPriority, TicketStatus } from './entities/ticket.entity.js';

const OPEN_STATUSES = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_ON_EMPLOYEE];

@Injectable()
export class HelpdeskService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketComment) private readonly comments: Repository<TicketComment>,
    private readonly notifications: NotificationsService,
  ) {}

  private isStaff(user: AuthUser) {
    return hasPermission(user, Permission.HELPDESK_MANAGE);
  }

  private async nextNumber() {
    const rows = await this.tickets.createQueryBuilder('t').select('t.ticketNumber', 'n').getRawMany<{ n: string }>();
    const max = rows.reduce((m, r) => Math.max(m, Number(r.n.split('-').pop()) || 1000), 1000);
    return `HD-${max + 1}`;
  }

  async create(user: AuthUser, dto: CreateTicketDto) {
    const raisedById = requireEmployeeId(user);
    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const ticket = await this.tickets.save(
      this.tickets.create({
        ...dto,
        priority,
        raisedById,
        ticketNumber: await this.nextNumber(),
        status: TicketStatus.OPEN,
        slaDueAt: new Date(Date.now() + SLA_HOURS[priority] * 36e5),
      }),
    );
    // Route to the right support team.
    await this.notifications.notifyRole(dto.category === TicketCategory.IT_SUPPORT ? Role.IT_ADMIN : Role.HR_ADMIN, {
      title: `New ${priority.toLowerCase()} ticket ${ticket.ticketNumber}`,
      message: dto.subject,
      type: NotificationType.ACTION,
      link: `/helpdesk/${ticket.id}`,
    });
    return ticket;
  }

  async list(user: AuthUser, query: TicketQueryDto) {
    const qb = this.tickets
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.raisedBy', 'r')
      .leftJoinAndSelect('t.assignee', 'a')
      .orderBy('t.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.scope === 'all') assertPermission(user, Permission.HELPDESK_MANAGE);
    else if (query.scope === 'assigned') qb.andWhere('t.assigneeId = :me', { me: requireEmployeeId(user) });
    else qb.andWhere('t.raisedById = :me', { me: requireEmployeeId(user) });
    if (query.status) qb.andWhere('t.status = :s', { s: query.status });
    if (query.category) qb.andWhere('t.category = :c', { c: query.category });
    if (query.priority) qb.andWhere('t.priority = :p', { p: query.priority });
    if (query.search) {
      qb.andWhere('(LOWER(t.subject) LIKE :q OR LOWER(t.ticketNumber) LIKE :q)', { q: `%${query.search.toLowerCase()}%` });
    }
    const [rows, total] = await qb.getManyAndCount();
    const now = Date.now();
    const data = rows.map((t) => ({
      ...t,
      isOverdue: OPEN_STATUSES.includes(t.status) && t.slaDueAt.getTime() < now,
    }));
    return paginated(data, total, query);
  }

  async get(id: string, user: AuthUser) {
    const ticket = await this.tickets.findOne({
      where: { id },
      relations: { raisedBy: { designation: true, department: true }, assignee: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const staff = this.isStaff(user);
    if (!staff && ticket.raisedById !== user.employeeId && ticket.assigneeId !== user.employeeId) {
      throw new ForbiddenException();
    }
    const comments = await this.comments.find({
      where: staff ? { ticketId: id } : { ticketId: id, isInternal: false },
      relations: { author: { designation: true } },
      order: { createdAt: 'ASC' },
    });
    return { ...ticket, comments, isOverdue: OPEN_STATUSES.includes(ticket.status) && ticket.slaDueAt < new Date() };
  }

  async update(id: string, dto: UpdateTicketDto, user: AuthUser) {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (dto.priority && dto.priority !== ticket.priority) {
      ticket.slaDueAt = new Date(ticket.createdAt.getTime() + SLA_HOURS[dto.priority] * 36e5);
    }
    if (dto.status && [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(dto.status) && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    if (dto.status && OPEN_STATUSES.includes(dto.status)) ticket.resolvedAt = null;
    Object.assign(ticket, dto);
    await this.tickets.save(ticket);

    if (dto.status) {
      await this.notifications.notifyEmployees([ticket.raisedById], {
        title: `${ticket.ticketNumber} is now ${dto.status.replace(/_/g, ' ').toLowerCase()}`,
        type: dto.status === TicketStatus.RESOLVED ? NotificationType.SUCCESS : NotificationType.INFO,
        link: `/helpdesk/${id}`,
      });
    }
    if (dto.assigneeId && dto.assigneeId !== user.employeeId) {
      await this.notifications.notifyEmployees([dto.assigneeId], {
        title: `${ticket.ticketNumber} assigned to you`,
        message: ticket.subject,
        type: NotificationType.ACTION,
        link: `/helpdesk/${id}`,
      });
    }
    return this.get(id, user);
  }

  async comment(id: string, dto: CommentDto, user: AuthUser) {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const staff = this.isStaff(user);
    const isRequester = ticket.raisedById === user.employeeId;
    if (!staff && !isRequester) throw new ForbiddenException();
    if (dto.isInternal && !staff) throw new ForbiddenException('Only support staff can add internal notes');

    await this.comments.save(
      this.comments.create({
        ticketId: id,
        authorId: requireEmployeeId(user),
        message: dto.message,
        isInternal: !!dto.isInternal,
      }),
    );
    if (isRequester && ticket.status === TicketStatus.WAITING_ON_EMPLOYEE) {
      await this.tickets.update(id, { status: TicketStatus.IN_PROGRESS });
    }
    if (!dto.isInternal) {
      const notify = isRequester ? [ticket.assigneeId] : [ticket.raisedById];
      await this.notifications.notifyEmployees(notify, {
        title: `New reply on ${ticket.ticketNumber}`,
        message: dto.message.slice(0, 140),
        link: `/helpdesk/${id}`,
      });
    }
    return this.get(id, user);
  }

  async rate(id: string, satisfaction: number, user: AuthUser) {
    const ticket = await this.tickets.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.raisedById !== user.employeeId) throw new ForbiddenException();
    if (![TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(ticket.status)) {
      throw new BadRequestException('You can rate a ticket once it is resolved');
    }
    await this.tickets.update(id, { satisfaction, status: TicketStatus.CLOSED });
    return this.get(id, user);
  }

  async stats() {
    const all = await this.tickets.find();
    const open = all.filter((t) => OPEN_STATUSES.includes(t.status));
    const resolved = all.filter((t) => t.resolvedAt);
    const rated = all.filter((t) => t.satisfaction);
    const withinSla = resolved.filter((t) => t.resolvedAt! <= t.slaDueAt);
    return {
      open: open.length,
      overdue: open.filter((t) => t.slaDueAt < new Date()).length,
      unassigned: open.filter((t) => !t.assigneeId).length,
      resolved: resolved.length,
      slaCompliance: resolved.length ? Math.round((withinSla.length / resolved.length) * 100) : 100,
      avgResolutionHours: resolved.length
        ? Math.round(resolved.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / resolved.length / 36e5)
        : null,
      csat: rated.length ? Math.round((rated.reduce((s, t) => s + t.satisfaction!, 0) / rated.length) * 10) / 10 : null,
      byCategory: Object.values(TicketCategory).map((c) => ({ category: c, count: all.filter((t) => t.category === c).length })),
    };
  }
}
