import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { monthRange, todayISO } from '../../common/utils/dates.js';
import { EMPLOYED_STATUSES, Employee, EmployeeStatus } from '../employees/entities/employee.entity.js';
import { EmploymentEvent, EmploymentEventType } from '../employees/entities/employment-event.entity.js';
import { CalendarService } from '../holidays/calendar.service.js';
import { LeaveRequest, LeaveStatus } from '../leave/entities/leave-request.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import { CreatePayrollRunDto, StructureQueryDto, UpsertSalaryStructureDto } from './dto/payroll.dto.js';
import { PayrollRun, PayrollRunStatus } from './entities/payroll-run.entity.js';
import { Payslip } from './entities/payslip.entity.js';
import { SalaryStructure } from './entities/salary-structure.entity.js';
import { computeMonthly, DEFAULT_COMPONENTS } from './payroll.calculator.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(SalaryStructure) private readonly structures: Repository<SalaryStructure>,
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    @InjectRepository(Payslip) private readonly payslips: Repository<Payslip>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(LeaveRequest) private readonly leaves: Repository<LeaveRequest>,
    @InjectRepository(EmploymentEvent) private readonly history: Repository<EmploymentEvent>,
    private readonly calendar: CalendarService,
    private readonly org: OrganizationService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Salary structures ────────────────────────────────

  defaultComponents() {
    return DEFAULT_COMPONENTS;
  }

  async listStructures(query: StructureQueryDto) {
    const qb = this.employees
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.department', 'department')
      .leftJoinAndMapOne('e.salary', SalaryStructure, 's', 's.employeeId = e.id AND s.isCurrent = :cur', { cur: true })
      .where('e.status IN (:...st)', { st: EMPLOYED_STATUSES })
      .orderBy('e.firstName', 'ASC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.filter === 'missing') qb.andWhere('s.id IS NULL');
    if (query.search) {
      qb.andWhere('(LOWER(e.firstName) LIKE :q OR LOWER(e.lastName) LIKE :q OR LOWER(e.employeeCode) LIKE :q)', {
        q: `%${query.search.toLowerCase()}%`,
      });
    }
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async getStructure(employeeId: string, user: AuthUser) {
    if (employeeId !== user.employeeId && !hasPermission(user, Permission.PAYROLL_MANAGE)) {
      throw new ForbiddenException('You cannot view this compensation');
    }
    const [structure, settings, history] = await Promise.all([
      this.structures.findOne({ where: { employeeId, isCurrent: true } }),
      this.org.getSettings(),
      this.structures.find({ where: { employeeId }, order: { effectiveFrom: 'DESC' } }),
    ]);
    return {
      structure,
      breakdown: structure ? computeMonthly(structure.annualCtc, structure.components, settings.taxSlabs) : null,
      history,
    };
  }

  async upsertStructure(employeeId: string, dto: UpsertSalaryStructureDto, actor: AuthUser) {
    const employee = await this.employees.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const components = dto.components?.length ? dto.components : DEFAULT_COMPONENTS;
    if (components.filter((c) => c.calculation === 'BALANCE').length > 1) {
      throw new BadRequestException('Only one balancing component is allowed');
    }
    const settings = await this.org.getSettings();
    const previous = await this.structures.findOne({ where: { employeeId, isCurrent: true } });
    if (previous) await this.structures.update(previous.id, { isCurrent: false });

    const saved = await this.structures.save(
      this.structures.create({
        employeeId,
        annualCtc: dto.annualCtc,
        currency: dto.currency ?? settings.currency,
        components,
        effectiveFrom: dto.effectiveFrom,
        notes: dto.notes ?? null,
        isCurrent: true,
      }),
    );
    if (previous && previous.annualCtc !== dto.annualCtc) {
      const pct = previous.annualCtc ? ((dto.annualCtc - previous.annualCtc) / previous.annualCtc) * 100 : 0;
      await this.history.save(
        this.history.create({
          employeeId,
          type: EmploymentEventType.COMPENSATION_CHANGE,
          effectiveDate: dto.effectiveFrom,
          summary: `Compensation revised (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`,
          recordedById: actor.employeeId,
          details: { note: dto.notes ?? null },
        }),
      );
    }
    return saved;
  }

  // ── Payroll runs ─────────────────────────────────────

  listRuns() {
    return this.runs.find({ order: { year: 'DESC', month: 'DESC' } });
  }

  async getRun(id: string) {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    const payslips = await this.payslips.find({
      where: { payrollRunId: id },
      relations: { employee: { designation: true, department: true } },
      order: { employee: { firstName: 'ASC' } },
    });
    return { ...run, payslips };
  }

  async createRun(dto: CreatePayrollRunDto, actor: AuthUser) {
    if (await this.runs.exists({ where: { year: dto.year, month: dto.month } })) {
      throw new BadRequestException(`A payroll run for ${MONTHS[dto.month - 1]} ${dto.year} already exists`);
    }
    const { start, end } = monthRange(dto.year, dto.month);
    if (start > todayISO()) throw new BadRequestException('Cannot run payroll for a future month');
    const settings = await this.org.getSettings();
    const run = await this.runs.save(
      this.runs.create({
        year: dto.year,
        month: dto.month,
        periodStart: start,
        periodEnd: end,
        currency: settings.currency,
        notes: dto.notes ?? null,
        status: PayrollRunStatus.DRAFT,
        processedById: actor.employeeId,
      }),
    );
    await this.compute(run);
    return this.getRun(run.id);
  }

  async recalculate(id: string) {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) throw new BadRequestException('Only draft runs can be recalculated');
    await this.compute(run);
    return this.getRun(id);
  }

  /** (Re)generate all payslips for a draft run. */
  private async compute(run: PayrollRun) {
    const settings = await this.org.getSettings();
    await this.payslips.delete({ payrollRunId: run.id });

    const candidates = await this.employees
      .createQueryBuilder('e')
      .where('e.dateOfJoining <= :end', { end: run.periodEnd })
      .andWhere(
        '(e.status IN (:...employed) OR (e.status = :exited AND e.dateOfExit >= :start))',
        { employed: EMPLOYED_STATUSES, exited: EmployeeStatus.EXITED, start: run.periodStart },
      )
      .getMany();
    const structures = await this.structures.find({
      where: { employeeId: In(candidates.map((c) => c.id)), isCurrent: true },
    });
    const byEmployee = new Map(structures.map((s) => [s.employeeId, s]));

    const unpaid = await this.leaves
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.leaveType', 't')
      .where('t.isPaid = :paid', { paid: false })
      .andWhere('l.status = :s', { s: LeaveStatus.APPROVED })
      .andWhere('l.startDate <= :end AND l.endDate >= :start', { start: run.periodStart, end: run.periodEnd })
      .getMany();

    const slips: Payslip[] = [];
    for (const e of candidates) {
      const structure = byEmployee.get(e.id);
      if (!structure) continue;

      const workingDays = await this.calendar.countWorkingDays(run.periodStart, run.periodEnd, e.locationId);
      const from = e.dateOfJoining > run.periodStart ? e.dateOfJoining : run.periodStart;
      const to = e.dateOfExit && e.dateOfExit < run.periodEnd ? e.dateOfExit : run.periodEnd;
      const employedDays = from <= to ? await this.calendar.countWorkingDays(from, to, e.locationId) : 0;

      let lopDays = 0;
      for (const l of unpaid.filter((l) => l.employeeId === e.id)) {
        if (l.isHalfDay) lopDays += 0.5;
        else {
          const s = l.startDate > from ? l.startDate : from;
          const t = l.endDate < to ? l.endDate : to;
          if (s <= t) lopDays += await this.calendar.countWorkingDays(s, t, e.locationId);
        }
      }
      const paidDays = Math.max(0, employedDays - lopDays);
      const factor = workingDays ? paidDays / workingDays : 0;
      const pay = computeMonthly(structure.annualCtc, structure.components, settings.taxSlabs, factor);

      slips.push(
        this.payslips.create({
          payrollRunId: run.id,
          employeeId: e.id,
          year: run.year,
          month: run.month,
          workingDays,
          paidDays,
          lopDays,
          annualCtc: structure.annualCtc,
          currency: structure.currency,
          isPublished: false,
          ...pay,
        }),
      );
    }
    await this.payslips.save(slips, { chunk: 100 });
    await this.runs.update(run.id, {
      employeeCount: slips.length,
      totalGross: r2(slips.reduce((s, p) => s + p.gross, 0)),
      totalDeductions: r2(slips.reduce((s, p) => s + p.totalDeductions, 0)),
      totalNet: r2(slips.reduce((s, p) => s + p.net, 0)),
    });
  }

  async finalize(id: string, actor: AuthUser) {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) throw new BadRequestException('Run is already processed');
    await this.runs.update(id, {
      status: PayrollRunStatus.PROCESSED,
      processedAt: new Date(),
      processedById: actor.employeeId,
    });
    return this.getRun(id);
  }

  async markPaid(id: string) {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.PROCESSED) throw new BadRequestException('Run must be processed before payment');
    await this.runs.update(id, { status: PayrollRunStatus.PAID, paidAt: new Date() });
    await this.payslips.update({ payrollRunId: id }, { isPublished: true });

    const slips = await this.payslips.find({ where: { payrollRunId: id }, select: { employeeId: true } });
    await this.notifications.notifyEmployees(
      slips.map((s) => s.employeeId),
      {
        title: `Payslip for ${MONTHS[run.month - 1]} ${run.year} is available`,
        type: NotificationType.SUCCESS,
        link: '/payslips',
      },
    );
    return this.getRun(id);
  }

  async deleteRun(id: string) {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) throw new BadRequestException('Only draft runs can be deleted');
    await this.runs.delete(id);
  }

  // ── Payslips ─────────────────────────────────────────

  myPayslips(user: AuthUser) {
    return this.payslips.find({
      where: { employeeId: requireEmployeeId(user), isPublished: true },
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async getPayslip(id: string, user: AuthUser) {
    const slip = await this.payslips.findOne({
      where: { id },
      relations: { employee: { designation: true, department: true, location: true } },
    });
    if (!slip) throw new NotFoundException('Payslip not found');
    const isOwner = slip.employeeId === user.employeeId && slip.isPublished;
    if (!isOwner && !hasPermission(user, Permission.PAYROLL_MANAGE)) throw new ForbiddenException();
    const settings = await this.org.getSettings();
    return { ...slip, company: { name: settings.companyName, legalName: settings.legalName } };
  }

  async summary() {
    const runs = await this.runs.find({ order: { year: 'DESC', month: 'DESC' }, take: 12 });
    return runs.reverse().map((r) => ({
      period: `${MONTHS[r.month - 1]} ${r.year}`,
      gross: r.totalGross,
      net: r.totalNet,
      deductions: r.totalDeductions,
      employees: r.employeeCount,
      status: r.status,
    }));
  }
}
