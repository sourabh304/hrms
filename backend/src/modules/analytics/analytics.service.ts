import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { monthRange, todayISO } from '../../common/utils/dates.js';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity.js';
import { EMPLOYED_STATUSES, Employee, EmployeeStatus } from '../employees/entities/employee.entity.js';
import { Kudos } from '../engagement/entities/kudos.entity.js';
import { LeaveBalance } from '../leave/entities/leave-balance.entity.js';
import { LeaveRequest, LeaveStatus } from '../leave/entities/leave-request.entity.js';
import { Separation, SeparationStatus } from '../offboarding/entities/separation.entity.js';
import { PayrollRun } from '../payroll/entities/payroll-run.entity.js';
import { JobOpening, JobStatus } from '../recruitment/entities/job-opening.entity.js';
import { ApprovalRequest } from '../workflow/entities/approval-request.entity.js';
import { RequestStatus } from '../workflow/workflow.types.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) ?? 'Unassigned';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

const yearsBetween = (from: string, to: string) =>
  (new Date(to).getTime() - new Date(from).getTime()) / (365.25 * 864e5);

/** People analytics: read-only aggregates across modules. */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(AttendanceRecord) private readonly attendance: Repository<AttendanceRecord>,
    @InjectRepository(LeaveRequest) private readonly leaves: Repository<LeaveRequest>,
    @InjectRepository(LeaveBalance) private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(JobOpening) private readonly jobs: Repository<JobOpening>,
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    @InjectRepository(ApprovalRequest) private readonly approvals: Repository<ApprovalRequest>,
    @InjectRepository(Separation) private readonly separations: Repository<Separation>,
    @InjectRepository(Kudos) private readonly kudos: Repository<Kudos>,
  ) {}

  async workforce() {
    const today = todayISO();
    const all = await this.employees.find({ relations: { department: true, location: true, designation: true } });
    const employed = all.filter((e) => EMPLOYED_STATUSES.includes(e.status));

    // 12-month trend
    const now = new Date();
    const trend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const { start, end } = monthRange(d.getFullYear(), d.getMonth() + 1);
      trend.push({
        month: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        headcount: all.filter((e) => e.dateOfJoining <= end && (!e.dateOfExit || e.dateOfExit > end)).length,
        hires: all.filter((e) => e.dateOfJoining >= start && e.dateOfJoining <= end).length,
        exits: all.filter((e) => e.dateOfExit && e.dateOfExit >= start && e.dateOfExit <= end).length,
      });
    }
    const exits12 = trend.reduce((s, t) => s + t.exits, 0);
    const avgHeadcount = trend.reduce((s, t) => s + t.headcount, 0) / trend.length || 1;
    const thisMonth = trend[trend.length - 1];

    const tenures = employed.map((e) => yearsBetween(e.dateOfJoining, today));
    const tenureBuckets = [
      { name: '< 1 yr', value: tenures.filter((t) => t < 1).length },
      { name: '1–3 yrs', value: tenures.filter((t) => t >= 1 && t < 3).length },
      { name: '3–5 yrs', value: tenures.filter((t) => t >= 3 && t < 5).length },
      { name: '5+ yrs', value: tenures.filter((t) => t >= 5).length },
    ];

    const levels = [...new Set(employed.map((e) => e.designation?.level).filter((l): l is string => !!l))].sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true }),
    );
    const diversityByLevel = levels.map((level) => {
      const inLevel = employed.filter((e) => e.designation?.level === level);
      return {
        level,
        female: inLevel.filter((e) => e.gender === 'FEMALE').length,
        male: inLevel.filter((e) => e.gender === 'MALE').length,
        other: inLevel.filter((e) => e.gender !== 'FEMALE' && e.gender !== 'MALE').length,
      };
    });

    const [presentToday, onLeaveToday, openJobs, pendingApprovals, balances, runs, separations, kudos30] =
      await Promise.all([
        this.attendance.count({ where: { date: today } }),
        this.leaves
          .createQueryBuilder('l')
          .where('l.status = :s', { s: LeaveStatus.APPROVED })
          .andWhere('l.startDate <= :t AND l.endDate >= :t', { t: today })
          .getCount(),
        this.jobs.find({ where: { status: JobStatus.OPEN } }),
        this.approvals.count({ where: { status: RequestStatus.PENDING } }),
        this.balances.find({ where: { year: now.getFullYear() }, relations: { leaveType: true } }),
        this.runs.find({ order: { year: 'DESC', month: 'DESC' }, take: 12 }),
        this.separations.find({
          where: { createdAt: MoreThanOrEqual(new Date(Date.now() - 365 * 864e5)) },
        }),
        this.kudos.count({ where: { createdAt: MoreThanOrEqual(new Date(Date.now() - 30 * 864e5)) } }),
      ]);

    const leaveByType = new Map<string, { used: number; allocated: number; color: string }>();
    for (const b of balances) {
      const cur = leaveByType.get(b.leaveType.name) ?? { used: 0, allocated: 0, color: b.leaveType.color };
      cur.used += b.used;
      cur.allocated += b.allocated + b.carriedForward;
      leaveByType.set(b.leaveType.name, cur);
    }

    return {
      summary: {
        headcount: employed.length,
        newHiresThisMonth: thisMonth.hires,
        exitsThisMonth: thisMonth.exits,
        attritionRate12m: Math.round((exits12 / avgHeadcount) * 1000) / 10,
        avgTenureYears: tenures.length ? Math.round((tenures.reduce((s, t) => s + t, 0) / tenures.length) * 10) / 10 : 0,
        onProbation: employed.filter((e) => e.status === EmployeeStatus.PROBATION).length,
        onNotice: employed.filter((e) => e.status === EmployeeStatus.NOTICE_PERIOD).length,
        presentToday,
        onLeaveToday,
        openPositions: openJobs.reduce((s, j) => s + Math.max(0, j.openings - j.filled), 0),
        pendingApprovals,
        kudosLast30Days: kudos30,
        femaleRatio: employed.length
          ? Math.round((employed.filter((e) => e.gender === 'FEMALE').length / employed.length) * 100)
          : 0,
      },
      trend,
      byDepartment: countBy(employed, (e) => e.department?.name),
      byLocation: countBy(employed, (e) => e.location?.name),
      byEmploymentType: countBy(employed, (e) => e.employmentType),
      byGender: countBy(employed, (e) => e.gender),
      byWorkMode: countBy(employed, (e) => e.workMode),
      tenureBuckets,
      diversityByLevel,
      leaveUtilization: [...leaveByType.entries()].map(([name, v]) => ({
        name,
        used: Math.round(v.used * 10) / 10,
        allocated: Math.round(v.allocated * 10) / 10,
        color: v.color,
      })),
      payrollTrend: runs.reverse().map((r) => ({
        period: `${MONTHS[r.month - 1]} ${String(r.year).slice(2)}`,
        gross: r.totalGross,
        net: r.totalNet,
      })),
      separationsByType: countBy(
        separations.filter((s) => s.status !== SeparationStatus.WITHDRAWN && s.status !== SeparationStatus.REJECTED),
        (s) => s.type,
      ),
    };
  }
}
