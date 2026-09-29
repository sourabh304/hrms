import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { atTime, minutesBetween, monthRange, todayISO } from '../../common/utils/dates.js';
import { applyScope } from '../../common/utils/scope.js';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import { CalendarService, DayInfo } from '../holidays/calendar.service.js';
import { LeaveRequest, LeaveStatus } from '../leave/entities/leave-request.entity.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { RequestStatus, WORKFLOW_DECIDED, WorkflowType } from '../workflow/workflow.types.js';
import type { WorkflowDecidedEvent } from '../workflow/workflow.types.js';
import {
  CreateShiftDto,
  MonthQueryDto,
  PunchDto,
  RegularizationQueryDto,
  RegularizeDto,
  RosterQueryDto,
  UpdateShiftDto,
} from './dto/attendance.dto.js';
import { AttendanceRecord, AttendanceSource, AttendanceStatus } from './entities/attendance-record.entity.js';
import { Regularization, RegularizationStatus } from './entities/regularization.entity.js';
import { Shift } from './entities/shift.entity.js';

export type DayStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND'
  | 'NOT_MARKED'
  | 'UPCOMING';

const FALLBACK_SHIFT = { name: 'General', startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakMinutes: 60 };

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(Shift) private readonly shifts: Repository<Shift>,
    @InjectRepository(Regularization) private readonly regularizations: Repository<Regularization>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(LeaveRequest) private readonly leaves: Repository<LeaveRequest>,
    private readonly calendar: CalendarService,
    private readonly workflow: WorkflowService,
  ) {}

  // ── Shifts ───────────────────────────────────────────

  listShifts() {
    return this.shifts.find({ order: { isDefault: 'DESC', name: 'ASC' } });
  }

  async createShift(dto: CreateShiftDto) {
    if (dto.isDefault) await this.shifts.update({ isDefault: true }, { isDefault: false });
    return this.shifts.save(this.shifts.create({ ...dto, code: dto.code.toUpperCase() }));
  }

  async updateShift(id: string, dto: UpdateShiftDto) {
    const shift = await this.shifts.findOne({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    if (dto.isDefault) await this.shifts.update({ isDefault: true }, { isDefault: false });
    return this.shifts.save(Object.assign(shift, dto));
  }

  private async shiftFor(employee: Employee) {
    if (employee.shiftId) {
      const s = await this.shifts.findOne({ where: { id: employee.shiftId } });
      if (s) return s;
    }
    return (await this.shifts.findOne({ where: { isDefault: true } })) ?? FALLBACK_SHIFT;
  }

  // ── Punching ─────────────────────────────────────────

  private async me(user: AuthUser) {
    const employee = await this.employees.findOne({ where: { id: requireEmployeeId(user) } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async clockIn(user: AuthUser, dto: PunchDto) {
    const employee = await this.me(user);
    const date = todayISO();
    const existing = await this.records.findOne({ where: { employeeId: employee.id, date } });
    if (existing?.checkIn) throw new ConflictException('You have already clocked in today');

    const shift = await this.shiftFor(employee);
    const now = new Date();
    const lateBy = minutesBetween(atTime(date, shift.startTime), now) - shift.graceMinutes;
    const record = this.records.create({
      ...(existing ?? {}),
      employeeId: employee.id,
      date,
      checkIn: now,
      status: AttendanceStatus.PRESENT,
      isLate: lateBy > 0,
      lateMinutes: Math.max(0, lateBy + (lateBy > 0 ? shift.graceMinutes : 0)),
      source: dto.source ?? AttendanceSource.WEB,
      notes: dto.notes ?? null,
    });
    return this.records.save(record);
  }

  async clockOut(user: AuthUser, dto: PunchDto) {
    const employee = await this.me(user);
    const record = await this.records.findOne({ where: { employeeId: employee.id, date: todayISO() } });
    if (!record?.checkIn) throw new BadRequestException('You have not clocked in today');

    const shift = await this.shiftFor(employee);
    record.checkOut = new Date();
    record.workMinutes = Math.max(0, minutesBetween(record.checkIn, record.checkOut) - (shift.breakMinutes ?? 0));
    const shiftMinutes =
      minutesBetween(atTime(record.date, shift.startTime), atTime(record.date, shift.endTime)) - shift.breakMinutes;
    record.status = record.workMinutes >= shiftMinutes / 2 ? AttendanceStatus.PRESENT : AttendanceStatus.HALF_DAY;
    if (dto.notes) record.notes = dto.notes;
    return this.records.save(record);
  }

  async today(user: AuthUser) {
    const employee = await this.me(user);
    const date = todayISO();
    const [record, shift, [day]] = await Promise.all([
      this.records.findOne({ where: { employeeId: employee.id, date } }),
      this.shiftFor(employee),
      this.calendar.classify(date, date, employee.locationId),
    ]);
    return { date, record, shift, day };
  }

  // ── Calendars & rosters ──────────────────────────────

  private dayStatus(
    day: DayInfo,
    record: AttendanceRecord | undefined,
    onLeave: boolean,
    today: string,
    joined: string,
  ): DayStatus {
    if (record?.checkIn) {
      if (record.status === AttendanceStatus.HALF_DAY) return 'HALF_DAY';
      return record.isLate ? 'LATE' : 'PRESENT';
    }
    if (onLeave) return 'ON_LEAVE';
    if (day.kind === 'HOLIDAY') return 'HOLIDAY';
    if (day.kind === 'WEEKEND') return 'WEEKEND';
    if (day.date > today || day.date < joined) return 'UPCOMING';
    if (day.date === today) return 'NOT_MARKED';
    return 'ABSENT';
  }

  async month(user: AuthUser, query: MonthQueryDto) {
    const employeeId = query.employeeId ?? requireEmployeeId(user);
    if (employeeId !== user.employeeId && !hasPermission(user, Permission.ATTENDANCE_MANAGE)) {
      const target = await this.employees.findOne({ where: { id: employeeId }, select: { id: true, managerId: true } });
      if (target?.managerId !== user.employeeId) throw new ForbiddenException('Not allowed');
    }
    const employee = await this.employees.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const [y, m] = query.month.split('-').map(Number);
    const { start, end } = monthRange(y, m);
    const [days, records, leaves] = await Promise.all([
      this.calendar.classify(start, end, employee.locationId),
      this.records.find({ where: { employeeId, date: Between(start, end) } }),
      this.leaves
        .createQueryBuilder('l')
        .leftJoinAndSelect('l.leaveType', 't')
        .where('l.employeeId = :employeeId', { employeeId })
        .andWhere('l.status = :s', { s: LeaveStatus.APPROVED })
        .andWhere('l.startDate <= :end AND l.endDate >= :start', { start, end })
        .getMany(),
    ]);

    const today = todayISO();
    const byDate = new Map(records.map((r) => [r.date, r]));
    const result = days.map((d) => {
      const leave = leaves.find((l) => l.startDate <= d.date && l.endDate >= d.date && d.kind === 'WORKING');
      const record = byDate.get(d.date);
      return {
        date: d.date,
        status: this.dayStatus(d, record, !!leave, today, employee.dateOfJoining),
        holiday: d.holiday ?? null,
        leaveType: leave?.leaveType.name ?? null,
        record: record ?? null,
      };
    });

    const count = (s: DayStatus) => result.filter((r) => r.status === s).length;
    const totalMinutes = records.reduce((sum, r) => sum + r.workMinutes, 0);
    const workedDays = records.filter((r) => r.workMinutes > 0).length;
    return {
      month: query.month,
      days: result,
      summary: {
        present: count('PRESENT') + count('LATE'),
        late: count('LATE'),
        halfDay: count('HALF_DAY'),
        absent: count('ABSENT'),
        onLeave: count('ON_LEAVE'),
        holidays: count('HOLIDAY'),
        workingDays: days.filter((d) => d.kind === 'WORKING').length,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgHours: workedDays ? Math.round((totalMinutes / workedDays / 60) * 10) / 10 : 0,
      },
    };
  }

  async roster(user: AuthUser, query: RosterQueryDto) {
    const qb = this.employees
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.department', 'department')
      .where('e.status IN (:...s)', { s: EMPLOYED_STATUSES })
      .andWhere('e.dateOfJoining <= :date', { date: query.date })
      .orderBy('e.firstName', 'ASC');
    if (query.scope === 'all') assertPermission(user, Permission.ATTENDANCE_MANAGE);
    else qb.andWhere('e.managerId = :me', { me: requireEmployeeId(user) });
    if (query.departmentId) qb.andWhere('e.departmentId = :d', { d: query.departmentId });
    const employees = await qb.getMany();
    const ids = employees.map((e) => e.id);
    if (!ids.length) return { date: query.date, rows: [], summary: this.summarize([]) };

    const [records, leaves, [day]] = await Promise.all([
      this.records.find({ where: { employeeId: In(ids), date: query.date } }),
      this.leaves.find({
        where: { employeeId: In(ids), status: LeaveStatus.APPROVED },
        relations: { leaveType: true },
      }),
      this.calendar.classify(query.date, query.date),
    ]);
    const today = todayISO();
    const rows = employees.map((e) => {
      const record = records.find((r) => r.employeeId === e.id);
      const leave = leaves.find((l) => l.employeeId === e.id && l.startDate <= query.date && l.endDate >= query.date);
      return {
        employee: { id: e.id, fullName: e.fullName, employeeCode: e.employeeCode, avatarUrl: e.avatarUrl, designation: e.designation?.title ?? null, department: e.department?.name ?? null },
        record: record ?? null,
        leaveType: leave?.leaveType.name ?? null,
        status: this.dayStatus(day, record, !!leave && day.kind === 'WORKING', today, e.dateOfJoining),
      };
    });
    return { date: query.date, rows, summary: this.summarize(rows.map((r) => r.status)) };
  }

  private summarize(statuses: DayStatus[]) {
    const c = (s: DayStatus) => statuses.filter((x) => x === s).length;
    return {
      total: statuses.length,
      present: c('PRESENT') + c('LATE') + c('HALF_DAY'),
      late: c('LATE'),
      absent: c('ABSENT'),
      onLeave: c('ON_LEAVE'),
      notMarked: c('NOT_MARKED'),
    };
  }

  // ── Regularization ───────────────────────────────────

  async regularize(user: AuthUser, dto: RegularizeDto) {
    const employee = await this.me(user);
    if (dto.date > todayISO()) throw new BadRequestException('Cannot regularize a future date');
    if (dto.checkOut <= dto.checkIn) throw new BadRequestException('Check-out must be after check-in');
    const pending = await this.regularizations.exists({
      where: { employeeId: employee.id, date: dto.date, status: RegularizationStatus.PENDING },
    });
    if (pending) throw new ConflictException('A regularization for this date is already pending');

    const reg = await this.regularizations.save(
      this.regularizations.create({ ...dto, employeeId: employee.id, status: RegularizationStatus.PENDING }),
    );
    const approval = await this.workflow.submit({
      type: WorkflowType.ATTENDANCE_REGULARIZATION,
      entityId: reg.id,
      requesterId: employee.id,
      title: `Attendance correction · ${dto.date}`,
      summary: dto.reason,
      link: '/attendance',
      metadata: { date: dto.date, checkIn: dto.checkIn, checkOut: dto.checkOut },
    });
    await this.regularizations.update(reg.id, { approvalRequestId: approval.id });
    return this.regularizations.findOne({ where: { id: reg.id } });
  }

  @OnEvent(WORKFLOW_DECIDED)
  async onDecision(event: WorkflowDecidedEvent) {
    if (event.type !== WorkflowType.ATTENDANCE_REGULARIZATION) return;
    const reg = await this.regularizations.findOne({ where: { id: event.entityId } });
    if (!reg || reg.status !== RegularizationStatus.PENDING) return;

    if (event.status !== RequestStatus.APPROVED) {
      await this.regularizations.update(reg.id, { status: RegularizationStatus.REJECTED });
      return;
    }
    const checkIn = atTime(reg.date, reg.checkIn);
    const checkOut = atTime(reg.date, reg.checkOut);
    const existing = await this.records.findOne({ where: { employeeId: reg.employeeId, date: reg.date } });
    await this.records.save(
      this.records.create({
        ...(existing ?? {}),
        employeeId: reg.employeeId,
        date: reg.date,
        checkIn,
        checkOut,
        workMinutes: minutesBetween(checkIn, checkOut),
        status: AttendanceStatus.PRESENT,
        isLate: false,
        lateMinutes: 0,
        source: AttendanceSource.REGULARIZED,
        notes: reg.reason,
      }),
    );
    await this.regularizations.update(reg.id, { status: RegularizationStatus.APPROVED });
  }

  async listRegularizations(user: AuthUser, query: RegularizationQueryDto) {
    const qb = this.regularizations
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.employee', 'e')
      .orderBy('r.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    applyScope(qb, { scope: query.scope, user, employeeAlias: 'e', permission: Permission.ATTENDANCE_MANAGE });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }
}
