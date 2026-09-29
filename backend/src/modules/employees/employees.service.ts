import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission, Role } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { addDays, todayISO } from '../../common/utils/dates.js';
import { Designation } from '../organization/entities/designation.entity.js';
import { OrganizationService } from '../organization/organization.service.js';
import { UsersService } from '../users/users.service.js';
import {
  CreateEmployeeDto,
  EmployeeQueryDto,
  UpdateEmployeeDto,
  UpdateMyProfileDto,
} from './dto/employee.dto.js';
import { EMPLOYEE_CREATED, EmployeeCreatedEvent } from './employees.events.js';
import { EMPLOYED_STATUSES, Employee, EmployeeStatus } from './entities/employee.entity.js';
import { EmploymentEvent, EmploymentEventType } from './entities/employment-event.entity.js';

const PRIVATE_FIELDS = [
  'personalEmail',
  'dateOfBirth',
  'maritalStatus',
  'nationality',
  'bloodGroup',
  'address',
  'emergencyContact',
] as const;

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
    @InjectRepository(EmploymentEvent) private readonly history: Repository<EmploymentEvent>,
    @InjectRepository(Designation) private readonly designations: Repository<Designation>,
    private readonly org: OrganizationService,
    private readonly users: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Visibility ───────────────────────────────────────

  /** Strip personal data the viewer is not entitled to see. */
  sanitize(employee: Employee, viewer: AuthUser): Employee {
    const isSelf = viewer.employeeId === employee.id;
    const isHr = hasPermission(viewer, Permission.EMPLOYEE_WRITE);
    const isPayroll = hasPermission(viewer, Permission.PAYROLL_MANAGE);
    const isManager = !!viewer.employeeId && employee.managerId === viewer.employeeId;

    const copy = Object.assign(Object.create(Object.getPrototypeOf(employee)), employee) as Employee;
    if (!(isSelf || isHr || isManager)) {
      for (const f of PRIVATE_FIELDS) (copy as unknown as Record<string, unknown>)[f] = null;
    }
    if (!(isSelf || isHr || isPayroll)) copy.bankDetails = null;
    return copy;
  }

  // ── Queries ──────────────────────────────────────────

  private baseQuery() {
    return this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.department', 'department')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.location', 'location')
      .leftJoinAndSelect('e.manager', 'manager');
  }

  async list(query: EmployeeQueryDto, viewer: AuthUser) {
    const qb = this.baseQuery().skip(skipOf(query)).take(query.limit);

    if (query.search) {
      qb.andWhere(
        `(LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s OR LOWER(e.preferredName) LIKE :s
          OR LOWER(e.workEmail) LIKE :s OR LOWER(e.employeeCode) LIKE :s)`,
        { s: `%${query.search.toLowerCase()}%` },
      );
    }
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    else if (!query.includeExited) qb.andWhere('e.status IN (:...employed)', { employed: EMPLOYED_STATUSES });
    if (query.departmentId) qb.andWhere('e.departmentId = :d', { d: query.departmentId });
    if (query.designationId) qb.andWhere('e.designationId = :g', { g: query.designationId });
    if (query.locationId) qb.andWhere('e.locationId = :l', { l: query.locationId });
    if (query.managerId) qb.andWhere('e.managerId = :m', { m: query.managerId });
    if (query.employmentType) qb.andWhere('e.employmentType = :t', { t: query.employmentType });

    if (query.sort === 'joined') qb.orderBy('e.dateOfJoining', 'DESC');
    else if (query.sort === 'code') qb.orderBy('e.employeeCode', 'ASC');
    else qb.orderBy('e.firstName', 'ASC').addOrderBy('e.lastName', 'ASC');

    const [rows, total] = await qb.getManyAndCount();
    return paginated(rows.map((r) => this.sanitize(r, viewer)), total, query);
  }

  async getEntity(id: string) {
    const employee = await this.baseQuery()
      .leftJoinAndSelect('manager.designation', 'managerDesignation')
      .where('e.id = :id', { id })
      .getOne();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async findOne(id: string, viewer: AuthUser) {
    const employee = await this.getEntity(id);
    const [directReports, user] = await Promise.all([
      this.repo.find({
        where: { managerId: id, status: In(EMPLOYED_STATUSES) },
        relations: { designation: true },
        order: { firstName: 'ASC' },
      }),
      hasPermission(viewer, Permission.USER_MANAGE) ? this.users.findByEmployeeId(id) : null,
    ]);
    return {
      ...this.sanitize(employee, viewer),
      directReports,
      account: user ? { id: user.id, email: user.email, roles: user.roles, isActive: user.isActive } : null,
    };
  }

  async me(viewer: AuthUser) {
    return this.findOne(requireEmployeeId(viewer), viewer);
  }

  lookup(search?: string) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.designation', 'designation')
      .where('e.status IN (:...employed)', { employed: EMPLOYED_STATUSES })
      .orderBy('e.firstName', 'ASC')
      .take(25);
    if (search) {
      qb.andWhere(
        '(LOWER(e.firstName) LIKE :s OR LOWER(e.lastName) LIKE :s OR LOWER(e.employeeCode) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }
    return qb.getMany().then((rows) =>
      rows.map((e) => ({
        id: e.id,
        fullName: e.fullName,
        employeeCode: e.employeeCode,
        designation: e.designation?.title ?? null,
        avatarUrl: e.avatarUrl,
      })),
    );
  }

  /** Flat list for the org chart; the client assembles the tree from managerId. */
  async orgChart() {
    const rows = await this.repo.find({
      where: { status: In(EMPLOYED_STATUSES) },
      relations: { designation: true, department: true, location: true },
      order: { firstName: 'ASC' },
    });
    return rows.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      employeeCode: e.employeeCode,
      avatarUrl: e.avatarUrl,
      managerId: e.managerId,
      designation: e.designation?.title ?? null,
      level: e.designation?.level ?? null,
      department: e.department?.name ?? null,
      location: e.location?.city ?? null,
    }));
  }

  timeline(employeeId: string) {
    return this.history.find({ where: { employeeId }, order: { effectiveDate: 'DESC', createdAt: 'DESC' } });
  }

  /** Upcoming birthdays and work anniversaries within the next `days`. */
  async celebrations(days = 30) {
    const employees = await this.repo.find({
      where: { status: In(EMPLOYED_STATUSES) },
      relations: { designation: true },
    });
    const today = todayISO();
    const end = addDays(today, days);
    const year = Number(today.slice(0, 4));
    const nextOccurrence = (iso: string) => {
      const md = iso.slice(5);
      const thisYear = `${year}-${md}`;
      return thisYear >= today ? thisYear : `${year + 1}-${md}`;
    };

    const items: {
      type: 'BIRTHDAY' | 'ANNIVERSARY';
      date: string;
      years?: number;
      employee: { id: string; fullName: string; avatarUrl: string | null; designation: string | null };
    }[] = [];
    for (const e of employees) {
      const who = { id: e.id, fullName: e.fullName, avatarUrl: e.avatarUrl, designation: e.designation?.title ?? null };
      if (e.dateOfBirth) {
        const date = nextOccurrence(e.dateOfBirth);
        if (date <= end) items.push({ type: 'BIRTHDAY', date, employee: who });
      }
      const date = nextOccurrence(e.dateOfJoining);
      const years = Number(date.slice(0, 4)) - Number(e.dateOfJoining.slice(0, 4));
      if (years > 0 && date <= end) items.push({ type: 'ANNIVERSARY', date, years, employee: who });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Commands ─────────────────────────────────────────

  private async nextEmployeeCode(): Promise<string> {
    const { employeeCodePrefix: prefix } = await this.org.getSettings();
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.employeeCode', 'code')
      .where('e.employeeCode LIKE :p', { p: `${prefix}-%` })
      .getRawMany<{ code: string }>();
    const max = rows.reduce((m, r) => Math.max(m, Number(r.code.split('-').pop()) || 0), 0);
    return `${prefix}-${String(max + 1).padStart(4, '0')}`;
  }

  private async assertValidManager(employeeId: string | null, managerId: string | null | undefined) {
    if (!managerId) return;
    if (managerId === employeeId) throw new BadRequestException('An employee cannot report to themselves');
    let cursor: string | null = managerId;
    for (let depth = 0; cursor && depth < 50; depth++) {
      const m: Employee | null = await this.repo.findOne({ where: { id: cursor }, select: { id: true, managerId: true } });
      if (!m) throw new BadRequestException('Manager not found');
      if (employeeId && m.managerId === employeeId) {
        throw new BadRequestException('This change would create a circular reporting line');
      }
      cursor = m.managerId;
    }
  }

  private recordEvent(
    employeeId: string,
    type: EmploymentEventType,
    summary: string,
    effectiveDate: string,
    recordedById: string | null,
    details?: Record<string, unknown>,
  ) {
    return this.history.save(
      this.history.create({ employeeId, type, summary, effectiveDate, recordedById, details: details ?? null }),
    );
  }

  async create(dto: CreateEmployeeDto, actor: AuthUser | null) {
    const { createUserAccount, roles, initialPassword, ...data } = dto;
    await this.assertValidManager(null, data.managerId);

    const settings = await this.org.getSettings();
    const employee = this.repo.create({
      ...data,
      workEmail: data.workEmail.toLowerCase(),
      employeeCode: await this.nextEmployeeCode(),
      status: data.status ?? EmployeeStatus.PROBATION,
      probationEndDate: data.probationEndDate ?? addDays(data.dateOfJoining, settings.probationDays),
    });
    const saved = await this.repo.save(employee);
    await this.recordEvent(saved.id, EmploymentEventType.HIRE, 'Joined the company', saved.dateOfJoining, actor?.employeeId ?? null);

    let temporaryPassword: string | undefined;
    if (createUserAccount) {
      temporaryPassword = initialPassword ?? `Welcome-${randomBytes(4).toString('hex')}`;
      await this.users.createAccount({
        email: saved.workEmail,
        password: temporaryPassword,
        roles: roles?.length ? roles : [Role.EMPLOYEE],
        employeeId: saved.id,
        mustChangePassword: !initialPassword,
      });
    }

    const event: EmployeeCreatedEvent = { employeeId: saved.id, createdByEmployeeId: actor?.employeeId ?? null };
    await this.events.emitAsync(EMPLOYEE_CREATED, event);

    const result = await this.getEntity(saved.id);
    return { ...result, temporaryPassword: initialPassword ? undefined : temporaryPassword };
  }

  async update(id: string, dto: UpdateEmployeeDto, actor: AuthUser) {
    const before = await this.getEntity(id);
    const { changeNote, ...changes } = dto;
    if ('managerId' in changes) await this.assertValidManager(id, changes.managerId);
    if (changes.workEmail) changes.workEmail = changes.workEmail.toLowerCase();

    await this.repo.update(id, changes as Partial<Employee>);
    const after = await this.getEntity(id);
    await this.recordChanges(before, after, actor, changeNote);
    return this.sanitize(after, actor);
  }

  /** Translate field changes into job-history events. */
  private async recordChanges(before: Employee, after: Employee, actor: AuthUser, note?: string) {
    const today = todayISO();
    const by = actor.employeeId;

    if (before.designationId !== after.designationId && after.designationId) {
      const [from, to] = await Promise.all([
        before.designationId ? this.designations.findOne({ where: { id: before.designationId } }) : null,
        this.designations.findOne({ where: { id: after.designationId } }),
      ]);
      const promoted = !!from && !!to && to.level.localeCompare(from.level, undefined, { numeric: true }) > 0;
      await this.recordEvent(
        after.id,
        promoted ? EmploymentEventType.PROMOTION : EmploymentEventType.TRANSFER,
        `${promoted ? 'Promoted' : 'Role changed'} to ${to?.title ?? 'new role'}${from ? ` from ${from.title}` : ''}`,
        today,
        by,
        { from: from?.title ?? null, to: to?.title ?? null, note },
      );
    }
    if (before.departmentId !== after.departmentId || before.locationId !== after.locationId) {
      await this.recordEvent(
        after.id,
        EmploymentEventType.TRANSFER,
        `Transferred to ${after.department?.name ?? '—'} · ${after.location?.name ?? '—'}`,
        today,
        by,
        { fromDepartment: before.department?.name ?? null, fromLocation: before.location?.name ?? null, note },
      );
    }
    if (before.managerId !== after.managerId) {
      await this.recordEvent(
        after.id,
        EmploymentEventType.MANAGER_CHANGE,
        `Now reports to ${after.manager?.fullName ?? 'no one'}`,
        today,
        by,
        { from: before.manager?.fullName ?? null, note },
      );
    }
    if (before.status !== after.status) {
      await this.recordEvent(
        after.id,
        after.status === EmployeeStatus.EXITED ? EmploymentEventType.EXIT : EmploymentEventType.STATUS_CHANGE,
        `Status changed from ${before.status} to ${after.status}`,
        today,
        by,
        { note },
      );
    }
  }

  async updateMe(viewer: AuthUser, dto: UpdateMyProfileDto) {
    const id = requireEmployeeId(viewer);
    await this.repo.update(id, dto as Partial<Employee>);
    return this.findOne(id, viewer);
  }

  /** Used by other modules (recruitment hire, offboarding exit). */
  async setStatus(id: string, status: EmployeeStatus, actorEmployeeId: string | null, extra: Partial<Employee> = {}) {
    const before = await this.getEntity(id);
    await this.repo.update(id, { status, ...extra });
    if (before.status !== status) {
      await this.recordEvent(
        id,
        status === EmployeeStatus.EXITED ? EmploymentEventType.EXIT : EmploymentEventType.STATUS_CHANGE,
        status === EmployeeStatus.EXITED ? 'Left the company' : `Status changed from ${before.status} to ${status}`,
        extra.dateOfExit ?? todayISO(),
        actorEmployeeId,
      );
    }
  }
}
