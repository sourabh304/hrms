import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { applyScope } from '../../common/utils/scope.js';
import { addDays, todayISO } from '../../common/utils/dates.js';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import { CalendarService } from '../holidays/calendar.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { RequestStatus, WORKFLOW_DECIDED, WorkflowType } from '../workflow/workflow.types.js';
import type { WorkflowDecidedEvent } from '../workflow/workflow.types.js';
import {
  AdjustBalanceDto,
  ApplyLeaveDto,
  CreateLeaveTypeDto,
  LeaveCalendarQueryDto,
  LeaveQueryDto,
  UpdateLeaveTypeDto,
} from './dto/leave.dto.js';
import { LeaveBalance } from './entities/leave-balance.entity.js';
import { LeaveRequest, LeaveStatus } from './entities/leave-request.entity.js';
import { LeaveType } from './entities/leave-type.entity.js';

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveType) private readonly types: Repository<LeaveType>,
    @InjectRepository(LeaveBalance) private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(LeaveRequest) private readonly requests: Repository<LeaveRequest>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly calendar: CalendarService,
    private readonly workflow: WorkflowService,
  ) {}

  // ── Leave types ──────────────────────────────────────

  listTypes(includeInactive = false) {
    return this.types.find({ where: includeInactive ? {} : { isActive: true }, order: { name: 'ASC' } });
  }

  createType(dto: CreateLeaveTypeDto) {
    return this.types.save(this.types.create({ ...dto, code: dto.code.toUpperCase() }));
  }

  async updateType(id: string, dto: UpdateLeaveTypeDto) {
    const type = await this.types.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Leave type not found');
    return this.types.save(Object.assign(type, dto));
  }

  // ── Balances ─────────────────────────────────────────

  /** Pro-rated entitlement for employees who joined during the year. */
  private entitlement(type: LeaveType, employee: Employee, year: number) {
    if (!type.isPaid) return 0;
    const joined = employee.dateOfJoining;
    if (joined <= `${year}-01-01`) return type.annualQuota;
    if (joined > `${year}-12-31`) return 0;
    const monthsRemaining = 12 - Number(joined.slice(5, 7)) + 1;
    return Math.round(((type.annualQuota * monthsRemaining) / 12) * 2) / 2;
  }

  /** Balances are created lazily the first time an employee's year is touched. */
  async ensureBalances(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const employee = await this.employees.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const [types, existing] = await Promise.all([
      this.types.find({ where: { isActive: true } }),
      this.balances.find({ where: { employeeId, year } }),
    ]);
    const have = new Set(existing.map((b) => b.leaveTypeId));
    const missing = types
      .filter((t) => !have.has(t.id))
      .filter((t) => !t.applicableGender || t.applicableGender === employee.gender)
      .map((t) =>
        this.balances.create({
          employeeId,
          leaveTypeId: t.id,
          year,
          allocated: this.entitlement(t, employee, year),
          carriedForward: 0,
          used: 0,
          pending: 0,
        }),
      );
    if (missing.length) await this.balances.save(missing);
    return this.balances.find({
      where: { employeeId, year },
      relations: { leaveType: true },
      order: { leaveType: { name: 'ASC' } },
    });
  }

  async balancesFor(user: AuthUser, employeeId: string | undefined, year: number) {
    const me = user.employeeId;
    const target = employeeId ?? requireEmployeeId(user);
    if (target !== me && !hasPermission(user, Permission.LEAVE_MANAGE)) {
      const emp = await this.employees.findOne({ where: { id: target }, select: { id: true, managerId: true } });
      if (emp?.managerId !== me) throw new ForbiddenException('You cannot view this employee’s balances');
    }
    return this.ensureBalances(target, year);
  }

  /** Year-start allocation with carry-forward from the previous year. */
  async allocateYear(year: number) {
    const employees = await this.employees.find({ where: { status: In(EMPLOYED_STATUSES) } });
    const types = await this.types.find({ where: { isActive: true } });
    let created = 0;
    for (const e of employees) {
      const prev = await this.balances.find({ where: { employeeId: e.id, year: year - 1 } });
      const current = await this.balances.find({ where: { employeeId: e.id, year } });
      for (const t of types) {
        if (t.applicableGender && t.applicableGender !== e.gender) continue;
        if (current.some((b) => b.leaveTypeId === t.id)) continue;
        const p = prev.find((b) => b.leaveTypeId === t.id);
        const carry = t.carryForward && p ? Math.min(Math.max(p.available, 0), t.maxCarryForward) : 0;
        await this.balances.save(
          this.balances.create({
            employeeId: e.id,
            leaveTypeId: t.id,
            year,
            allocated: this.entitlement(t, e, year),
            carriedForward: carry,
            used: 0,
            pending: 0,
          }),
        );
        created++;
      }
    }
    return { year, employees: employees.length, balancesCreated: created };
  }

  async adjustBalance(id: string, dto: AdjustBalanceDto) {
    const balance = await this.balances.findOne({ where: { id } });
    if (!balance) throw new NotFoundException('Balance not found');
    balance.allocated = dto.allocated;
    return this.balances.save(balance);
  }

  private async bumpBalance(req: LeaveRequest, delta: { used?: number; pending?: number }) {
    const year = Number(req.startDate.slice(0, 4));
    await this.ensureBalances(req.employeeId, year);
    const balance = await this.balances.findOne({
      where: { employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year },
    });
    if (!balance) return;
    balance.used = round1(balance.used + (delta.used ?? 0));
    balance.pending = round1(Math.max(0, balance.pending + (delta.pending ?? 0)));
    await this.balances.save(balance);
  }

  // ── Requests ─────────────────────────────────────────

  async preview(user: AuthUser, startDate: string, endDate: string, isHalfDay = false) {
    const emp = await this.employees.findOne({ where: { id: requireEmployeeId(user) } });
    const days = await this.calendar.classify(startDate, endDate, emp?.locationId);
    const working = days.filter((d) => d.kind === 'WORKING').length;
    return {
      days: isHalfDay ? (working ? 0.5 : 0) : working,
      breakdown: days,
    };
  }

  async apply(user: AuthUser, dto: ApplyLeaveDto) {
    const employeeId = requireEmployeeId(user);
    const [employee, type] = await Promise.all([
      this.employees.findOne({ where: { id: employeeId } }),
      this.types.findOne({ where: { id: dto.leaveTypeId, isActive: true } }),
    ]);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!type) throw new BadRequestException('Invalid leave type');
    if (type.applicableGender && type.applicableGender !== employee.gender) {
      throw new BadRequestException(`${type.name} is not applicable to you`);
    }
    if (dto.endDate < dto.startDate) throw new BadRequestException('End date must be on or after start date');
    if (dto.startDate < addDays(todayISO(), -30)) {
      throw new BadRequestException('Leave cannot be applied more than 30 days in the past');
    }
    if (dto.isHalfDay) {
      if (!type.allowHalfDay) throw new BadRequestException(`${type.name} cannot be taken as half day`);
      if (dto.startDate !== dto.endDate) throw new BadRequestException('Half-day leave must be a single date');
    }

    const working = await this.calendar.countWorkingDays(dto.startDate, dto.endDate, employee.locationId);
    const days = dto.isHalfDay ? 0.5 : working;
    if (!days) throw new BadRequestException('The selected dates fall on weekends or holidays');
    if (type.maxConsecutiveDays && days > type.maxConsecutiveDays) {
      throw new BadRequestException(`${type.name} allows at most ${type.maxConsecutiveDays} consecutive days`);
    }

    const overlap = await this.requests
      .createQueryBuilder('r')
      .where('r.employeeId = :employeeId', { employeeId })
      .andWhere('r.status IN (:...active)', { active: [LeaveStatus.PENDING, LeaveStatus.APPROVED] })
      .andWhere('r.startDate <= :end AND r.endDate >= :start', { start: dto.startDate, end: dto.endDate })
      .getCount();
    if (overlap) throw new BadRequestException('You already have leave booked on these dates');

    if (type.isPaid) {
      const balances = await this.ensureBalances(employeeId, Number(dto.startDate.slice(0, 4)));
      const balance = balances.find((b) => b.leaveTypeId === type.id);
      if (!balance || balance.available < days) {
        throw new BadRequestException(
          `Insufficient ${type.name} balance: ${balance?.available ?? 0} day(s) available, ${days} requested`,
        );
      }
    }

    const request = await this.requests.save(
      this.requests.create({
        employeeId,
        leaveTypeId: type.id,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days,
        isHalfDay: !!dto.isHalfDay,
        halfDaySession: dto.isHalfDay ? (dto.halfDaySession ?? 'FIRST') : null,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      }),
    );
    await this.bumpBalance(request, { pending: days });

    const approval = await this.workflow.submit({
      type: WorkflowType.LEAVE,
      entityId: request.id,
      requesterId: employeeId,
      title: `${type.name} · ${days} day${days === 1 ? '' : 's'}`,
      summary: dto.reason,
      link: '/leave',
      metadata: {
        leaveType: type.name,
        from: dto.startDate,
        to: dto.endDate,
        days,
        halfDay: !!dto.isHalfDay,
      },
    });
    await this.requests.update(request.id, { approvalRequestId: approval.id });
    return this.getOne(request.id);
  }

  @OnEvent(WORKFLOW_DECIDED)
  async onDecision(event: WorkflowDecidedEvent) {
    if (event.type !== WorkflowType.LEAVE) return;
    const req = await this.requests.findOne({ where: { id: event.entityId } });
    if (!req || req.status !== LeaveStatus.PENDING) return;

    const approved = event.status === RequestStatus.APPROVED;
    await this.requests.update(req.id, {
      status: approved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED,
      decidedAt: new Date(),
      decisionNote: event.comment,
    });
    await this.bumpBalance(req, approved ? { pending: -req.days, used: req.days } : { pending: -req.days });
  }

  async cancel(id: string, user: AuthUser) {
    const req = await this.getOne(id);
    const isOwner = req.employeeId === user.employeeId;
    if (!isOwner) assertPermission(user, Permission.LEAVE_MANAGE);

    if (req.status === LeaveStatus.PENDING) {
      await this.workflow.cancelForEntity(WorkflowType.LEAVE, req.id);
      await this.bumpBalance(req, { pending: -req.days });
    } else if (req.status === LeaveStatus.APPROVED) {
      if (req.startDate <= todayISO() && !hasPermission(user, Permission.LEAVE_MANAGE)) {
        throw new BadRequestException('Leave that has already started can only be cancelled by HR');
      }
      await this.bumpBalance(req, { used: -req.days });
    } else {
      throw new BadRequestException(`Cannot cancel a ${req.status.toLowerCase()} request`);
    }
    await this.requests.update(id, { status: LeaveStatus.CANCELLED });
    return this.getOne(id);
  }

  async getOne(id: string) {
    const req = await this.requests.findOne({
      where: { id },
      relations: { employee: { designation: true }, leaveType: true },
    });
    if (!req) throw new NotFoundException('Leave request not found');
    return req;
  }

  async list(user: AuthUser, query: LeaveQueryDto) {
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.employee', 'e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.department', 'department')
      .leftJoinAndSelect('r.leaveType', 't')
      .orderBy('r.startDate', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    applyScope(qb, { scope: query.scope, user, employeeAlias: 'e', permission: Permission.LEAVE_MANAGE });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.leaveTypeId) qb.andWhere('r.leaveTypeId = :t', { t: query.leaveTypeId });
    if (query.employeeId) qb.andWhere('r.employeeId = :emp', { emp: query.employeeId });
    if (query.from) qb.andWhere('r.endDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('r.startDate <= :to', { to: query.to });
    if (query.search) {
      qb.andWhere('(LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s)', {
        s: `%${query.search.toLowerCase()}%`,
      });
    }
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  /** Who's out: approved + pending leave overlapping a date range. */
  async calendarView(user: AuthUser, query: LeaveCalendarQueryDto) {
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.employee', 'e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('r.leaveType', 't')
      .where('r.status IN (:...s)', { s: [LeaveStatus.APPROVED, LeaveStatus.PENDING] })
      .andWhere('r.startDate <= :to AND r.endDate >= :from', { from: query.from, to: query.to })
      .orderBy('r.startDate', 'ASC');

    if (query.scope === 'all') {
      assertPermission(user, Permission.LEAVE_MANAGE);
      if (query.departmentId) qb.andWhere('e.departmentId = :d', { d: query.departmentId });
    } else {
      const me = await this.employees.findOne({ where: { id: requireEmployeeId(user) } });
      qb.andWhere(
        new Brackets((b) => {
          b.where('e.managerId = :me', { me: me!.id }).orWhere('e.id = :me', { me: me!.id });
          if (me!.managerId) b.orWhere('e.managerId = :mgr', { mgr: me!.managerId });
        }),
      );
    }
    return qb.getMany();
  }

  /** Employees on approved leave on a given date. */
  onLeaveOn(date: string) {
    return this.requests.find({
      where: { status: LeaveStatus.APPROVED, startDate: date },
      relations: { employee: true, leaveType: true },
    });
  }
}
