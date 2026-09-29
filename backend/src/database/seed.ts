/**
 * Seeds a realistic demo tenant. DESTRUCTIVE: drops and recreates every table.
 *
 *   npm run seed
 *
 * Pending approvals are created through the real services so that the workflow
 * engine, balances and notifications are exercised exactly as in production.
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../app.module.js';
import type { AuthUser } from '../common/auth/auth-user.js';
import { permissionsForRoles, Role } from '../common/auth/roles.js';
import { addDays, atTime, monthRange, todayISO } from '../common/utils/dates.js';
import { AssetAssignment } from '../modules/assets/entities/asset-assignment.entity.js';
import { Asset, AssetCategory, AssetCondition, AssetStatus } from '../modules/assets/entities/asset.entity.js';
import { AttendanceService } from '../modules/attendance/attendance.service.js';
import { AttendanceRecord, AttendanceSource, AttendanceStatus } from '../modules/attendance/entities/attendance-record.entity.js';
import { Shift } from '../modules/attendance/entities/shift.entity.js';
import { Announcement, AnnouncementCategory } from '../modules/announcements/entities/announcement.entity.js';
import { DocumentAcknowledgment } from '../modules/documents/entities/document-acknowledgment.entity.js';
import { Document, DocumentCategory } from '../modules/documents/entities/document.entity.js';
import { EmployeesService } from '../modules/employees/employees.service.js';
import { Employee, EmployeeStatus, EmploymentType, Gender, WorkMode } from '../modules/employees/entities/employee.entity.js';
import { EmploymentEvent, EmploymentEventType } from '../modules/employees/entities/employment-event.entity.js';
import { Kudos, KudosBadge } from '../modules/engagement/entities/kudos.entity.js';
import { Survey, SurveyResponse, SurveyStatus } from '../modules/engagement/entities/survey.entity.js';
import { ExpenseClaim, ExpenseCategory, ExpenseStatus } from '../modules/expenses/entities/expense-claim.entity.js';
import { ExpensesService } from '../modules/expenses/expenses.service.js';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, SLA_HOURS } from '../modules/helpdesk/entities/ticket.entity.js';
import { TicketComment } from '../modules/helpdesk/entities/ticket-comment.entity.js';
import { CalendarService } from '../modules/holidays/calendar.service.js';
import { Holiday, HolidayType } from '../modules/holidays/entities/holiday.entity.js';
import { Course, CourseFormat, CourseLevel } from '../modules/learning/entities/course.entity.js';
import { Enrollment, EnrollmentStatus } from '../modules/learning/entities/enrollment.entity.js';
import { LeaveBalance } from '../modules/leave/entities/leave-balance.entity.js';
import { LeaveRequest, LeaveStatus } from '../modules/leave/entities/leave-request.entity.js';
import { LeaveType } from '../modules/leave/entities/leave-type.entity.js';
import { LeaveService } from '../modules/leave/leave.service.js';
import { Notification } from '../modules/notifications/entities/notification.entity.js';
import { Separation, SeparationStatus, SeparationType } from '../modules/offboarding/entities/separation.entity.js';
import { OffboardingService } from '../modules/offboarding/offboarding.service.js';
import { JourneyTemplate, JourneyType } from '../modules/onboarding/entities/journey-template.entity.js';
import { Journey } from '../modules/onboarding/entities/journey.entity.js';
import { JourneyTask, TaskStatus } from '../modules/onboarding/entities/journey-task.entity.js';
import { Department } from '../modules/organization/entities/department.entity.js';
import { Designation } from '../modules/organization/entities/designation.entity.js';
import { Location } from '../modules/organization/entities/location.entity.js';
import { OrganizationService } from '../modules/organization/organization.service.js';
import { SalaryStructure } from '../modules/payroll/entities/salary-structure.entity.js';
import { DEFAULT_COMPONENTS } from '../modules/payroll/payroll.calculator.js';
import { PayrollService } from '../modules/payroll/payroll.service.js';
import { Feedback, FeedbackType } from '../modules/performance/entities/feedback.entity.js';
import { Goal, GoalCategory, GoalStatus } from '../modules/performance/entities/goal.entity.js';
import { PerformanceReview, ReviewStatus } from '../modules/performance/entities/performance-review.entity.js';
import { CycleStatus, CycleType, ReviewCycle } from '../modules/performance/entities/review-cycle.entity.js';
import { PerformanceService } from '../modules/performance/performance.service.js';
import { Candidate, CandidateSource } from '../modules/recruitment/entities/candidate.entity.js';
import { Interview, InterviewMode, InterviewStatus, Recommendation } from '../modules/recruitment/entities/interview.entity.js';
import { ApplicationStage, JobApplication } from '../modules/recruitment/entities/job-application.entity.js';
import { JobOpening, JobStatus } from '../modules/recruitment/entities/job-opening.entity.js';
import { RecruitmentService } from '../modules/recruitment/recruitment.service.js';
import { User } from '../modules/users/entities/user.entity.js';
import { WorkflowService } from '../modules/workflow/workflow.service.js';
import { StepStatus, WorkflowType } from '../modules/workflow/workflow.types.js';
import {
  COURSES,
  DEMO_PASSWORD,
  DEPARTMENTS,
  DESIGNATIONS,
  EMPLOYEES,
  HOLIDAYS,
  LEAVE_TYPES,
  LEVEL_SALARY,
  LOCATION_FACTOR,
  LOCATIONS,
  OFFBOARDING_TASKS,
  ONBOARDING_TASKS,
  POLICIES,
} from './seed-data.js';

// Deterministic PRNG so every seed produces the same tenant.
let state = 20260925;
const rand = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const log = (msg: string) => console.log(`  • ${msg}`);

async function main() {
  const TODAY = todayISO();
  const YEAR = Number(TODAY.slice(0, 4));
  console.log(`\nSeeding Segue HRMS demo tenant (today = ${TODAY})\n`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  await ds.synchronize(true);
  await app.get(WorkflowService).onModuleInit();
  log('schema reset');

  const repo = <T extends object>(e: new () => T) => ds.getRepository<T>(e);
  const org = app.get(OrganizationService);
  const calendar = app.get(CalendarService);

  // ── Organization ──────────────────────────────────────
  await org.getSettings();
  const locations = new Map<string, Location>();
  for (const l of LOCATIONS) locations.set(l.code, await repo(Location).save(repo(Location).create(l)));
  const departments = new Map<string, Department>();
  for (const d of DEPARTMENTS) {
    departments.set(d.code, await repo(Department).save(repo(Department).create({ name: d.name, code: d.code, costCenter: d.costCenter })));
  }
  const designations = new Map<string, Designation>();
  for (const [title, level, jobFamily] of DESIGNATIONS) {
    designations.set(title, await repo(Designation).save(repo(Designation).create({ title, level, jobFamily })));
  }
  const shifts = await repo(Shift).save([
    repo(Shift).create({ name: 'General', code: 'GEN', startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakMinutes: 60, isDefault: true }),
    repo(Shift).create({ name: 'Early', code: 'EARLY', startTime: '07:00', endTime: '16:00', graceMinutes: 10, breakMinutes: 60 }),
    repo(Shift).create({ name: 'APAC Support', code: 'APAC', startTime: '06:00', endTime: '15:00', graceMinutes: 10, breakMinutes: 45 }),
  ]);
  log(`${locations.size} locations, ${departments.size} departments, ${designations.size} designations, ${shifts.length} shifts`);

  // ── Employees & accounts ──────────────────────────────
  const emp = new Map<string, Employee>();
  const reportsCount = new Map<string, number>();
  for (const d of EMPLOYEES) if (d.manager) reportsCount.set(d.manager, (reportsCount.get(d.manager) ?? 0) + 1);

  let code = 1;
  for (const d of EMPLOYEES) {
    const byear = between(1976, 2001);
    const e = await repo(Employee).save(
      repo(Employee).create({
        employeeCode: `SEG-${String(code++).padStart(4, '0')}`,
        firstName: d.first,
        lastName: d.last,
        workEmail: d.email ?? `${d.first}.${d.last}@segueit.com`.toLowerCase().replace(/\s+/g, ''),
        personalEmail: `${d.first}.${d.last}${between(1, 99)}@example.com`.toLowerCase().replace(/\s+/g, ''),
        phone: `+${pick(['1', '44', '65', '91'])} ${between(200, 999)} ${between(100, 999)} ${between(1000, 9999)}`,
        gender: d.gender as Gender,
        dateOfBirth: `${byear}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`,
        nationality: { BLR: 'Indian', NYC: 'American', LON: 'British', SGP: 'Singaporean' }[d.loc],
        maritalStatus: pick(['Single', 'Married', 'Married', 'Single']),
        bloodGroup: pick(['A+', 'B+', 'O+', 'AB+', 'O-']),
        address: { line1: `${between(1, 250)} ${pick(['Park', 'Lake', 'Hill', 'Garden', 'River'])} Street`, city: locations.get(d.loc)!.city, country: locations.get(d.loc)!.country, postalCode: String(between(10000, 99999)) },
        emergencyContact: { name: `${pick(['Alex', 'Sam', 'Jordan', 'Chris', 'Taylor'])} ${d.last}`, relationship: pick(['Spouse', 'Parent', 'Sibling']), phone: `+1 555 ${between(100, 999)} ${between(1000, 9999)}` },
        bankDetails: { bankName: pick(['HSBC', 'Citibank', 'Barclays', 'DBS', 'HDFC Bank']), accountHolder: `${d.first} ${d.last}`, accountNumber: String(between(10000000, 99999999)) + String(between(1000, 9999)), routingCode: `RT${between(100000, 999999)}` },
        skills: d.dept === 'ENG' ? ['TypeScript', pick(['React', 'NestJS', 'Kubernetes', 'PostgreSQL', 'Go']), pick(['AWS', 'System Design', 'Testing'])] : [pick(['Communication', 'Stakeholder Management', 'Analytics', 'Negotiation', 'Excel'])],
        departmentId: departments.get(d.dept)!.id,
        designationId: designations.get(d.title)!.id,
        locationId: locations.get(d.loc)!.id,
        managerId: d.manager ? emp.get(d.manager)!.id : null,
        shiftId: d.loc === 'SGP' && d.dept === 'CS' ? shifts[2].id : null,
        employmentType: d.type ?? EmploymentType.FULL_TIME,
        workMode: d.mode ?? pick([WorkMode.HYBRID, WorkMode.HYBRID, WorkMode.ONSITE, WorkMode.REMOTE]),
        status: d.exited ? EmployeeStatus.EXITED : d.joined > addDays(TODAY, -90) ? EmployeeStatus.PROBATION : EmployeeStatus.ACTIVE,
        dateOfJoining: d.joined,
        probationEndDate: addDays(d.joined, 90),
        dateOfExit: d.exited ?? null,
        bio: null,
      }),
    );
    emp.set(d.key, e);
  }
  for (const d of DEPARTMENTS) await repo(Department).update(departments.get(d.code)!.id, { headId: emp.get(d.head)!.id });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = new Map<string, User>();
  for (const d of EMPLOYEES) {
    const e = emp.get(d.key)!;
    const roles = new Set<Role>([Role.EMPLOYEE, ...(d.roles ?? [])]);
    if (reportsCount.get(d.key)) roles.add(Role.MANAGER);
    users.set(d.key, await repo(User).save(repo(User).create({ email: e.workEmail, passwordHash, roles: [...roles], employeeId: e.id, isActive: !d.exited })));
  }
  const as = (key: string): AuthUser => {
    const u = users.get(key)!;
    return { id: u.id, email: u.email, roles: u.roles, permissions: permissionsForRoles(u.roles), employeeId: u.employeeId };
  };

  // Job history
  const events: EmploymentEvent[] = [];
  for (const d of EMPLOYEES) {
    const e = emp.get(d.key)!;
    events.push(repo(EmploymentEvent).create({ employeeId: e.id, type: EmploymentEventType.HIRE, effectiveDate: d.joined, summary: 'Joined the company' }));
    if (d.joined < '2022-01-01' && ['L5', 'L6', 'L7', 'L8'].includes(designations.get(d.title)!.level)) {
      events.push(repo(EmploymentEvent).create({ employeeId: e.id, type: EmploymentEventType.PROMOTION, effectiveDate: `${between(2022, 2025)}-04-01`, summary: `Promoted to ${d.title}` }));
    }
    if (d.exited) events.push(repo(EmploymentEvent).create({ employeeId: e.id, type: EmploymentEventType.EXIT, effectiveDate: d.exited, summary: 'Left the company' }));
  }
  await repo(EmploymentEvent).save(events, { chunk: 100 });
  log(`${emp.size} employees with accounts and job history`);

  // ── Calendar & leave setup ────────────────────────────
  for (const [date, name, type, loc] of HOLIDAYS) {
    await repo(Holiday).save(repo(Holiday).create({ date, name, type: type as HolidayType, locationId: loc ? locations.get(loc)!.id : null }));
  }
  const leaveTypes = new Map<string, LeaveType>();
  for (const t of LEAVE_TYPES) leaveTypes.set(t.code, await repo(LeaveType).save(repo(LeaveType).create(t)));

  await repo(JourneyTemplate).save([
    repo(JourneyTemplate).create({ name: 'Standard Onboarding', type: JourneyType.ONBOARDING, isDefault: true, description: 'Company-wide new hire journey: pre-boarding through the 30-day check-in.', tasks: [...ONBOARDING_TASKS] }),
    repo(JourneyTemplate).create({
      name: 'Engineering Onboarding', type: JourneyType.ONBOARDING, description: 'Standard onboarding plus engineering environment setup.',
      tasks: [...ONBOARDING_TASKS, { title: 'Set up development environment', category: 'Engineering', assignee: 'EMPLOYEE', dueOffsetDays: 2 }, { title: 'Codebase and architecture walkthrough', category: 'Engineering', assignee: 'MANAGER', dueOffsetDays: 3 }, { title: 'Ship first pull request', category: 'Engineering', assignee: 'EMPLOYEE', dueOffsetDays: 14 }],
    }),
    repo(JourneyTemplate).create({ name: 'Standard Offboarding', type: JourneyType.OFFBOARDING, isDefault: true, description: 'Exit clearance from knowledge transfer to relieving letter.', tasks: [...OFFBOARDING_TASKS] }),
  ]);
  log(`${HOLIDAYS.length} holidays, ${leaveTypes.size} leave types, 3 journey templates`);

  // New hires via the real service (fires the onboarding journey automatically)
  const employees = app.get(EmployeesService);
  for (const nh of [
    { key: 'hannah', firstName: 'Hannah', lastName: 'Lee', gender: Gender.FEMALE, title: 'Associate Software Engineer', loc: 'NYC', manager: 'daniel', joined: addDays(TODAY, -11), status: EmployeeStatus.PROBATION },
    { key: 'kabir', firstName: 'Kabir', lastName: 'Mehra', gender: Gender.MALE, title: 'Software Engineer', loc: 'BLR', manager: 'ananya', joined: addDays(TODAY, 10), status: EmployeeStatus.ONBOARDING },
  ]) {
    const created = await employees.create(
      {
        firstName: nh.firstName, lastName: nh.lastName, gender: nh.gender,
        workEmail: `${nh.firstName}.${nh.lastName}@segueit.com`.toLowerCase(),
        dateOfBirth: `${between(1998, 2002)}-0${between(1, 9)}-1${between(0, 9)}`,
        departmentId: departments.get('ENG')!.id, designationId: designations.get(nh.title)!.id,
        locationId: locations.get(nh.loc)!.id, managerId: emp.get(nh.manager)!.id,
        dateOfJoining: nh.joined, status: nh.status, workMode: WorkMode.HYBRID,
        createUserAccount: true, initialPassword: DEMO_PASSWORD, roles: [Role.EMPLOYEE],
      },
      as('hrd'),
    );
    const full = await repo(Employee).findOneByOrFail({ id: created.id });
    emp.set(nh.key, full);
    users.set(nh.key, await repo(User).findOneByOrFail({ employeeId: created.id }));
  }
  // Hannah is 11 days in: early tasks are done.
  const hannahJourney = await repo(Journey).findOneOrFail({ where: { employeeId: emp.get('hannah')!.id }, relations: { tasks: true } });
  for (const t of hannahJourney.tasks.filter((t) => t.dueDate <= addDays(TODAY, -1))) {
    await repo(JourneyTask).update(t.id, { status: TaskStatus.DONE, completedAt: new Date(`${t.dueDate}T12:00:00`) });
  }
  log('2 new hires created through EmployeesService → onboarding journeys started');

  const active = [...emp.entries()].filter(([, e]) => e.status !== EmployeeStatus.EXITED && e.dateOfJoining <= TODAY);

  // ── Leave history ─────────────────────────────────────
  const leave = app.get(LeaveService);
  for (const [, e] of active) await leave.ensureBalances(e.id, YEAR);

  const approvedLeave: LeaveRequest[] = [];
  const addApproved = async (key: string, typeCode: string, start: string, end: string, reason: string) => {
    const e = emp.get(key)!;
    const t = leaveTypes.get(typeCode)!;
    const days = await calendar.countWorkingDays(start, end, e.locationId);
    if (!days || approvedLeave.some((l) => l.employeeId === e.id && l.startDate <= end && l.endDate >= start)) return;
    const r = await repo(LeaveRequest).save(repo(LeaveRequest).create({ employeeId: e.id, leaveTypeId: t.id, startDate: start, endDate: end, days, reason, status: LeaveStatus.APPROVED, decidedAt: new Date(`${start}T09:00:00`) }));
    approvedLeave.push(r);
    const bal = await repo(LeaveBalance).findOneBy({ employeeId: e.id, leaveTypeId: t.id, year: Number(start.slice(0, 4)) });
    if (bal) await repo(LeaveBalance).update(bal.id, { used: bal.used + days });
  };
  const reasons = { AL: ['Family vacation', 'Travelling home', 'Personal time off', 'Wedding in the family'], SL: ['Fever and cold', 'Doctor appointment', 'Migraine'], CL: ['Personal errand', 'Home maintenance'] } as const;
  // Keep a light history for people with pending requests so their balances stay sufficient.
  const pendingRequesters = new Set(['sofia', 'ethan', 'priyar', 'vivek', 'meera', 'noah']);
  for (const [key, e] of active) {
    const count = pendingRequesters.has(key) ? 1 : between(1, 3);
    for (let i = 0; i < count; i++) {
      const month = between(1, Math.max(1, Number(TODAY.slice(5, 7)) - 2));
      const start = `${YEAR}-${String(month).padStart(2, '0')}-${String(between(2, 20)).padStart(2, '0')}`;
      if (start < e.dateOfJoining) continue;
      const code = pendingRequesters.has(key) ? 'SL' : pick(['AL', 'AL', 'SL', 'CL'] as const);
      const end = addDays(start, code === 'AL' ? between(1, 4) : between(0, 1));
      await addApproved(key, code, start, end, pick(reasons[code]));
    }
  }
  // Someone is out today; one unpaid leave last month (shows as LOP in payroll).
  await addApproved('meera', 'AL', addDays(TODAY, -1), addDays(TODAY, 1), 'Short break');
  const prev = new Date(YEAR, Number(TODAY.slice(5, 7)) - 2, 1);
  const lastMonth = monthRange(prev.getFullYear(), prev.getMonth() + 1);
  await addApproved('noah', 'LWP', addDays(lastMonth.start, 16), addDays(lastMonth.start, 17), 'Personal matter');

  // Pending requests through the real workflow
  await leave.apply(as('sofia'), { leaveTypeId: leaveTypes.get('AL')!.id, startDate: addDays(TODAY, 17), endDate: addDays(TODAY, 21), reason: 'Family trip to Barcelona' });
  await leave.apply(as('ethan'), { leaveTypeId: leaveTypes.get('CL')!.id, startDate: addDays(TODAY, 6), endDate: addDays(TODAY, 6), reason: 'Moving apartments' });
  await leave.apply(as('priyar'), { leaveTypeId: leaveTypes.get('AL')!.id, startDate: addDays(TODAY, 24), endDate: addDays(TODAY, 35), reason: 'Annual trip home to see family' });
  await leave.apply(as('vivek'), { leaveTypeId: leaveTypes.get('SL')!.id, startDate: addDays(TODAY, 3), endDate: addDays(TODAY, 3), reason: 'Scheduled minor procedure', isHalfDay: true, halfDaySession: 'FIRST' });
  log(`${approvedLeave.length} approved leave records, 4 pending requests in approval workflow`);

  // ── Attendance (last 30 days) ─────────────────────────
  const records: AttendanceRecord[] = [];
  for (const [key, e] of active) {
    const days = await calendar.classify(addDays(TODAY, -30), TODAY, e.locationId);
    for (const day of days) {
      if (day.kind !== 'WORKING' || day.date < e.dateOfJoining) continue;
      if (approvedLeave.some((l) => l.employeeId === e.id && l.startDate <= day.date && l.endDate >= day.date)) continue;
      const isToday = day.date === TODAY;
      if (isToday && (key === 'sofia' || rand() < 0.25)) continue; // leave room to demo clock-in
      if (!isToday && rand() < 0.03) continue; // absent
      const inMin = between(-25, 45);
      const checkIn = new Date(atTime(day.date, '09:00').getTime() + inMin * 60000);
      const checkOut = isToday ? null : new Date(atTime(day.date, '18:00').getTime() + between(-40, 70) * 60000);
      const work = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) - 60 : 0;
      records.push(repo(AttendanceRecord).create({
        employeeId: e.id, date: day.date, checkIn, checkOut, workMinutes: Math.max(0, work),
        status: checkOut && work < 240 ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT,
        isLate: inMin > 15, lateMinutes: inMin > 15 ? inMin : 0,
        source: pick([AttendanceSource.WEB, AttendanceSource.WEB, AttendanceSource.MOBILE, AttendanceSource.BIOMETRIC]),
      }));
    }
  }
  await repo(AttendanceRecord).save(records, { chunk: 200 });
  const lastWorkday = (await calendar.workingDays(addDays(TODAY, -7), addDays(TODAY, -1), emp.get('priyar')!.locationId)).pop()!;
  await repo(AttendanceRecord).delete({ employeeId: emp.get('priyar')!.id, date: lastWorkday });
  await app.get(AttendanceService).regularize(as('priyar'), { date: lastWorkday, checkIn: '09:05', checkOut: '18:10', reason: 'Biometric reader was offline; worked from office all day.' });
  log(`${records.length} attendance records, 1 pending regularization`);

  // ── Compensation & payroll ────────────────────────────
  const structures: SalaryStructure[] = [];
  for (const d of [...EMPLOYEES, { key: 'hannah', title: 'Associate Software Engineer', loc: 'NYC' }, { key: 'kabir', title: 'Software Engineer', loc: 'BLR' }]) {
    const e = emp.get(d.key)!;
    const level = designations.get(d.title)!.level;
    const ctc = Math.round((LEVEL_SALARY[level] * LOCATION_FACTOR[d.loc] * (0.92 + rand() * 0.16)) / 500) * 500;
    structures.push(repo(SalaryStructure).create({ employeeId: e.id, annualCtc: ctc, currency: 'USD', components: DEFAULT_COMPONENTS, effectiveFrom: e.dateOfJoining > `${YEAR}-01-01` ? e.dateOfJoining : `${YEAR}-01-01`, isCurrent: true }));
  }
  await repo(SalaryStructure).save(structures, { chunk: 100 });

  const payroll = app.get(PayrollService);
  const month = Number(TODAY.slice(5, 7));
  for (let m = month - 3; m < month; m++) {
    const y = m <= 0 ? YEAR - 1 : YEAR;
    const mm = m <= 0 ? m + 12 : m;
    const run = await payroll.createRun({ year: y, month: mm }, as('rahul'));
    await payroll.finalize(run.id, as('rahul'));
    await payroll.markPaid(run.id);
  }
  log(`${structures.length} salary structures, 3 paid payroll runs (current month left for demo)`);

  // ── Recruitment ───────────────────────────────────────
  const job = (data: Partial<JobOpening>) => repo(JobOpening).save(repo(JobOpening).create({ status: JobStatus.OPEN, postedAt: new Date(`${addDays(TODAY, -between(10, 40))}T10:00:00`), recruiterId: emp.get('aisha')!.id, isPublished: true, ...data }));
  const jobs = {
    fe: await job({ code: 'REQ-1001', title: 'Senior Frontend Engineer', departmentId: departments.get('ENG')!.id, designationId: designations.get('Senior Software Engineer')!.id, locationId: locations.get('BLR')!.id, openings: 2, hiringManagerId: emp.get('ananya')!.id, experienceMin: 5, experienceMax: 9, salaryMin: 40000, salaryMax: 55000, skills: ['React', 'TypeScript', 'Next.js', 'Accessibility'], description: 'Build delightful, accessible interfaces for Segue HRMS used by thousands of employees every day. You will own complex product surfaces end to end, from design partnership to production quality.', requirements: '5+ years building production React applications\nDeep TypeScript knowledge\nExperience with design systems and accessibility (WCAG 2.1 AA)\nComfort with performance profiling' }),
    design: await job({ code: 'REQ-1002', title: 'Product Designer', departmentId: departments.get('DES')!.id, designationId: designations.get('Product Designer')!.id, locationId: locations.get('LON')!.id, hiringManagerId: emp.get('chloe')!.id, experienceMin: 3, experienceMax: 7, salaryMin: 70000, salaryMax: 90000, skills: ['Figma', 'User Research', 'Prototyping'], description: 'Shape the end-to-end employee experience across self-service, approvals and analytics. Partner closely with product and engineering in a highly collaborative team.', requirements: 'Portfolio demonstrating product thinking\nExperience with complex B2B workflows\nStrong interaction design and prototyping skills' }),
    ae: await job({ code: 'REQ-1003', title: 'Account Executive — APAC', departmentId: departments.get('SALES')!.id, designationId: designations.get('Account Executive')!.id, locationId: locations.get('SGP')!.id, hiringManagerId: emp.get('william')!.id, experienceMin: 4, salaryMin: 75000, salaryMax: 95000, skills: ['Enterprise Sales', 'SaaS', 'Negotiation'], description: 'Own the full sales cycle for mid-market and enterprise accounts across Southeast Asia and ANZ, partnering with solutions consultants to deliver value-led deals.', requirements: '4+ years quota-carrying SaaS sales\nTrack record of closing six-figure deals\nExperience selling to HR or Finance buyers' }),
    devops: await job({ code: 'REQ-1004', title: 'DevOps Engineer', departmentId: departments.get('ENG')!.id, designationId: designations.get('DevOps Engineer')!.id, locationId: locations.get('NYC')!.id, hiringManagerId: emp.get('daniel')!.id, experienceMin: 3, salaryMin: 120000, salaryMax: 150000, skills: ['Kubernetes', 'Terraform', 'AWS'], description: 'Run and evolve the platform that powers Segue: CI/CD, observability, infrastructure as code and security hardening across multiple regions.', requirements: 'Production Kubernetes experience\nInfrastructure as code (Terraform)\nOn-call and incident management experience' }),
    intern: await job({ code: 'REQ-1005', title: 'Finance Analyst Intern', departmentId: departments.get('FIN')!.id, locationId: locations.get('BLR')!.id, hiringManagerId: emp.get('emily')!.id, employmentType: EmploymentType.INTERN, status: JobStatus.CLOSED, filled: 1, description: 'Six-month internship supporting FP&A, month-end close and payroll reconciliation.', isPublished: false }),
  };
  const recruitment = app.get(RecruitmentService);
  await recruitment.createJob(
    { title: 'Site Reliability Engineer', departmentId: departments.get('ENG')!.id, designationId: designations.get('DevOps Engineer')!.id, locationId: locations.get('NYC')!.id, openings: 1, description: 'Improve reliability, latency and cost efficiency of our multi-region platform. Define SLOs, lead incident reviews and automate toil away.', skills: ['SRE', 'Go', 'Observability'], salaryMin: 130000, salaryMax: 160000, submitForApproval: true },
    as('daniel'),
  );
  // Department head (VP Eng) approves; HR headcount approval remains pending.
  const [sreStep] = await app.get(WorkflowService).inbox(as('vpe'), WorkflowType.JOB_REQUISITION);
  if (sreStep) await app.get(WorkflowService).decide(sreStep.request.id, as('vpe'), StepStatus.APPROVED, 'Needed for the Q4 reliability roadmap.');

  const first = ['Aarav', 'Diya', 'Ben', 'Laila', 'Kenji', 'Amara', 'Felix', 'Nora', 'Ravi', 'Elena', 'Omar', 'Sakura', 'Leo', 'Ines', 'Victor', 'Maya', 'Arjun', 'Hana', 'Theo', 'Anika'];
  const last = ['Shah', 'Patel', 'Novak', 'Haddad', 'Tanaka', 'Okoye', 'Wagner', 'Lindqvist', 'Menon', 'Rossi', 'Farouk', 'Sato', 'Moreau', 'Garcia', 'Petrov', 'Cohen', 'Nair', 'Yamamoto', 'Evans', 'Kapoor'];
  const stagePlan: [keyof typeof jobs, ApplicationStage][] = [
    ['fe', ApplicationStage.APPLIED], ['fe', ApplicationStage.APPLIED], ['fe', ApplicationStage.SCREENING], ['fe', ApplicationStage.INTERVIEW], ['fe', ApplicationStage.INTERVIEW], ['fe', ApplicationStage.OFFER], ['fe', ApplicationStage.REJECTED],
    ['design', ApplicationStage.APPLIED], ['design', ApplicationStage.SCREENING], ['design', ApplicationStage.INTERVIEW], ['design', ApplicationStage.REJECTED],
    ['ae', ApplicationStage.APPLIED], ['ae', ApplicationStage.INTERVIEW], ['ae', ApplicationStage.OFFER],
    ['devops', ApplicationStage.APPLIED], ['devops', ApplicationStage.SCREENING], ['devops', ApplicationStage.INTERVIEW],
    ['intern', ApplicationStage.HIRED], ['intern', ApplicationStage.REJECTED], ['fe', ApplicationStage.WITHDRAWN],
  ];
  let ci = 0;
  for (const [jobKey, stage] of stagePlan) {
    const fn = first[ci], ln = last[ci];
    ci++;
    const cand = await repo(Candidate).save(repo(Candidate).create({
      firstName: fn, lastName: ln, email: `${fn}.${ln}@mail.example`.toLowerCase(), phone: `+44 7${between(100, 999)} ${between(100000, 999999)}`,
      currentCompany: pick(['Globex', 'Initech', 'Umbrella Corp', 'Hooli', 'Stark Industries', 'Wayne Enterprises']),
      currentTitle: jobs[jobKey].title.replace('Senior ', ''), experienceYears: between(2, 11), location: pick(['Bengaluru', 'London', 'Singapore', 'New York', 'Remote']),
      source: pick([CandidateSource.LINKEDIN, CandidateSource.CAREERS_SITE, CandidateSource.REFERRAL, CandidateSource.JOB_BOARD, CandidateSource.AGENCY]),
      linkedinUrl: `https://www.linkedin.com/in/${fn}-${ln}`.toLowerCase(), skills: jobs[jobKey].skills ?? [],
      referredById: rand() < 0.2 ? emp.get(pick(['sofia', 'rohan', 'jessica']))!.id : null,
    }));
    const appliedAt = new Date(`${addDays(TODAY, -between(5, 30))}T11:00:00`);
    const application = await repo(JobApplication).save(repo(JobApplication).create({
      jobId: jobs[jobKey].id, candidateId: cand.id, stage, appliedAt, stageChangedAt: new Date(appliedAt.getTime() + between(1, 6) * 864e5),
      rating: stage === ApplicationStage.APPLIED ? null : between(3, 5), offeredSalary: stage === ApplicationStage.OFFER ? (jobs[jobKey].salaryMax ?? 90000) : null,
      rejectionReason: stage === ApplicationStage.REJECTED ? pick(['Insufficient experience with required stack', 'Compensation expectations misaligned', 'Position filled']) : null,
    }));
    if (stage === ApplicationStage.INTERVIEW || stage === ApplicationStage.OFFER) {
      const interviewer = jobs[jobKey].hiringManagerId!;
      await repo(Interview).save(repo(Interview).create({ applicationId: application.id, interviewerId: interviewer, round: 'Technical / functional deep-dive', scheduledAt: new Date(`${addDays(TODAY, -4)}T15:00:00`), mode: InterviewMode.VIDEO, status: InterviewStatus.COMPLETED, rating: between(3, 5), recommendation: pick([Recommendation.HIRE, Recommendation.STRONG_HIRE]), feedback: 'Strong fundamentals and clear communication. Good ownership mindset; would benefit from more exposure to large-scale systems.' }));
      if (stage === ApplicationStage.INTERVIEW) {
        await repo(Interview).save(repo(Interview).create({ applicationId: application.id, interviewerId: jobKey === 'fe' ? emp.get('daniel')!.id : interviewer, round: 'Hiring manager round', scheduledAt: new Date(`${addDays(TODAY, between(1, 5))}T${between(10, 16)}:00:00`), mode: pick([InterviewMode.VIDEO, InterviewMode.ONSITE]), meetingLink: 'https://meet.example.com/segue-interview' }));
      }
    }
  }
  log(`${Object.keys(jobs).length + 1} requisitions, ${stagePlan.length} candidates across the pipeline`);

  // ── Performance ───────────────────────────────────────
  const competencies = ['Ownership', 'Collaboration', 'Execution', 'Communication', 'Customer Focus'];
  const h1 = await repo(ReviewCycle).save(repo(ReviewCycle).create({ name: `H1 ${YEAR} Performance Review`, type: CycleType.HALF_YEARLY, startDate: `${YEAR}-01-01`, endDate: `${YEAR}-06-30`, selfReviewDue: `${YEAR}-07-10`, managerReviewDue: `${YEAR}-07-24`, status: CycleStatus.CLOSED, competencies }));
  const h1Reviews = active
    .filter(([, e]) => e.dateOfJoining < `${YEAR}-04-01`)
    .map(([, e]) => {
      const rating = pick([2, 3, 3, 3, 4, 4, 4, 5]);
      return repo(PerformanceReview).create({
        cycleId: h1.id, employeeId: e.id, reviewerId: e.managerId, status: ReviewStatus.COMPLETED,
        competencies: competencies.map((name) => ({ name, self: between(3, 5), manager: Math.max(1, Math.min(5, rating + between(-1, 1))) })),
        selfRating: Math.min(5, rating + between(0, 1)), selfComments: 'Delivered my key commitments for the half and grew in collaboration across teams.',
        managerRating: rating, managerComments: 'Solid contributor with a strong sense of ownership.', finalRating: rating,
        strengths: 'Reliable delivery, positive team presence.', improvements: 'Broaden influence beyond the immediate team.',
        selfSubmittedAt: new Date(`${YEAR}-07-08T10:00:00`), managerSubmittedAt: new Date(`${YEAR}-07-20T10:00:00`),
      });
    });
  await repo(PerformanceReview).save(h1Reviews, { chunk: 100 });

  const performance = app.get(PerformanceService);
  const h2 = await performance.createCycle({ name: `H2 ${YEAR} Performance Review`, type: CycleType.HALF_YEARLY, startDate: `${YEAR}-07-01`, endDate: `${YEAR}-12-31`, selfReviewDue: addDays(TODAY, 14), managerReviewDue: addDays(TODAY, 28), competencies });
  await performance.launch(h2.id);

  const companyGoals = await repo(Goal).save([
    repo(Goal).create({ title: 'Grow ARR to $50M', category: GoalCategory.COMPANY, cycleId: h2.id, keyResults: [{ id: randomUUID(), title: 'New ARR booked', target: 12, current: 7.4, unit: '$M' }, { id: randomUUID(), title: 'Net revenue retention', target: 115, current: 109, unit: '%' }], progress: 0, status: GoalStatus.ON_TRACK, dueDate: `${YEAR}-12-31` }),
    repo(Goal).create({ title: 'Deliver a world-class employee experience', category: GoalCategory.COMPANY, cycleId: h2.id, keyResults: [{ id: randomUUID(), title: 'eNPS', target: 40, current: 31, unit: 'pts' }, { id: randomUUID(), title: 'Regretted attrition below', target: 8, current: 6, unit: '%' }], progress: 0, status: GoalStatus.ON_TRACK, dueDate: `${YEAR}-12-31` }),
    repo(Goal).create({ title: 'Achieve 99.95% platform availability', category: GoalCategory.COMPANY, cycleId: h2.id, keyResults: [{ id: randomUUID(), title: 'Monthly uptime', target: 99.95, current: 99.91, unit: '%' }, { id: randomUUID(), title: 'Sev-1 incidents', target: 2, current: 1, unit: 'max' }], progress: 0, status: GoalStatus.AT_RISK, dueDate: `${YEAR}-12-31` }),
  ]);
  const goalTemplates = [
    { title: 'Ship the new self-service onboarding experience', kr: [['Onboarding NPS', 60, 42, 'pts'], ['Time to first login', 1, 1, 'day']], parent: 1 },
    { title: 'Reduce p95 API latency', kr: [['p95 latency under', 250, 180, 'ms'], ['Endpoints migrated', 40, 26, 'count']], parent: 2 },
    { title: 'Close enterprise pipeline for Q4', kr: [['Qualified pipeline', 3, 2.1, '$M'], ['Deals closed', 6, 3, 'count']], parent: 0 },
    { title: 'Complete advanced certification', kr: [['Modules completed', 10, 6, 'count']], parent: null },
    { title: 'Improve release quality', kr: [['Escaped defects per release', 2, 3, 'max'], ['Automated test coverage', 85, 78, '%']], parent: 2 },
  ] as const;
  const goals: Goal[] = [];
  for (const [key, e] of active) {
    if (e.status === EmployeeStatus.ONBOARDING) continue;
    for (const tpl of [goalTemplates[pick([0, 1, 2, 4])], goalTemplates[3]]) {
      const keyResults = tpl.kr.map(([title, target, current, unit]) => ({ id: randomUUID(), title, target, current: Math.round(current * (0.6 + rand() * 0.5) * 10) / 10, unit }));
      const progress = Math.round((keyResults.reduce((s, k) => s + Math.min(k.current / k.target, 1), 0) / keyResults.length) * 100);
      goals.push(repo(Goal).create({ employeeId: e.id, cycleId: h2.id, title: tpl.title, category: tpl.parent === null ? GoalCategory.DEVELOPMENT : GoalCategory.INDIVIDUAL, parentGoalId: tpl.parent === null ? null : companyGoals[tpl.parent].id, keyResults, progress, weight: tpl.parent === null ? 30 : 70, status: progress >= 100 ? GoalStatus.COMPLETED : progress > 70 ? GoalStatus.ON_TRACK : pick([GoalStatus.ON_TRACK, GoalStatus.AT_RISK]), dueDate: `${YEAR}-12-15`, createdById: key === 'sofia' ? e.id : e.managerId }));
    }
  }
  await repo(Goal).save(goals, { chunk: 100 });
  for (const g of companyGoals) {
    g.progress = Math.round((g.keyResults.reduce((s, k) => s + Math.min(k.current / k.target, 1), 0) / g.keyResults.length) * 100);
    await repo(Goal).save(g);
  }
  // A few self reviews already submitted, one fully completed.
  for (const key of ['ethan', 'priyar', 'rohan', 'jessica']) {
    const review = await repo(PerformanceReview).findOneByOrFail({ cycleId: h2.id, employeeId: emp.get(key)!.id });
    await performance.submitSelf(review.id, as(key), { rating: 4, comments: 'Strong half: delivered my key projects on time and mentored a new teammate through onboarding.', competencies: competencies.map((name) => ({ name, rating: between(3, 5) })) });
  }
  const rohanReview = await repo(PerformanceReview).findOneByOrFail({ cycleId: h2.id, employeeId: emp.get('rohan')!.id });
  await performance.submitManager(rohanReview.id, as('ananya'), { rating: 5, comments: 'Rohan set the technical direction for the platform and raised the bar for the whole team.', strengths: 'Technical leadership, mentoring', improvements: 'Delegate more to grow others', competencies: competencies.map((name) => ({ name, rating: between(4, 5) })) });

  const feedbackPairs: [string, string, string][] = [
    ['daniel', 'sofia', 'Your design doc for the notifications service was excellent — clear trade-offs and great diagrams.'],
    ['sofia', 'ethan', 'Thanks for jumping in on the incident last night. Calm and methodical debugging!'],
    ['ananya', 'meera', 'Great progress on code reviews this month. Try to leave more context in PR descriptions.'],
    ['grace', 'isha', 'The customer interviews you ran reshaped our roadmap. Superb work.'],
    ['william', 'jessica', 'Fantastic negotiation on the Globex renewal.'],
  ];
  await repo(Feedback).save(feedbackPairs.map(([f, t, message]) => repo(Feedback).create({ fromId: emp.get(f)!.id, toId: emp.get(t)!.id, message, type: message.includes('Try') ? FeedbackType.CONSTRUCTIVE : FeedbackType.PRAISE })));
  log(`2 review cycles (H2 active), ${goals.length + companyGoals.length} goals, ${feedbackPairs.length} feedback`);

  // ── Learning ──────────────────────────────────────────
  const courses = await repo(Course).save(COURSES.map((c) => repo(Course).create({ ...c, level: c.level as CourseLevel, format: c.format as CourseFormat, skills: [...c.skills], contentUrl: 'https://learn.example.com/course' })));
  const enrollments: Enrollment[] = [];
  for (const [, e] of active) {
    for (const c of courses.filter((c) => c.isMandatory)) {
      const progress = pick([100, 100, 100, 60, 0]);
      enrollments.push(repo(Enrollment).create({ courseId: c.id, employeeId: e.id, progress, status: progress === 100 ? EnrollmentStatus.COMPLETED : progress ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.ENROLLED, dueDate: addDays(TODAY, between(-5, 20)), completedAt: progress === 100 ? new Date(`${addDays(TODAY, -between(5, 60))}T10:00:00`) : null, assignedById: emp.get('hrd')!.id }));
    }
    if (rand() < 0.6) {
      const c = pick(courses.filter((c) => !c.isMandatory));
      const progress = between(0, 10) * 10;
      enrollments.push(repo(Enrollment).create({ courseId: c.id, employeeId: e.id, progress, status: progress === 100 ? EnrollmentStatus.COMPLETED : progress ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.ENROLLED, completedAt: progress === 100 ? new Date() : null }));
    }
  }
  await repo(Enrollment).save(enrollments, { chunk: 200 });
  log(`${courses.length} courses, ${enrollments.length} enrollments`);

  // ── Expenses ──────────────────────────────────────────
  let claimNo = 1;
  const history: ExpenseClaim[] = [];
  const claimTitles: Partial<Record<ExpenseCategory, string>> = {
    TRAVEL: 'Client visit travel',
    MEALS: 'Team offsite dinner',
    INTERNET_PHONE: 'Home internet — monthly',
    SOFTWARE: 'Design tool subscription',
    TRAINING: 'Conference ticket',
  };
  for (const [, e] of active.slice(0, 30)) {
    const status = pick([ExpenseStatus.REIMBURSED, ExpenseStatus.REIMBURSED, ExpenseStatus.APPROVED, ExpenseStatus.REJECTED]);
    const category = pick([ExpenseCategory.TRAVEL, ExpenseCategory.MEALS, ExpenseCategory.INTERNET_PHONE, ExpenseCategory.SOFTWARE, ExpenseCategory.TRAINING]);
    const date = addDays(TODAY, -between(15, 90));
    history.push(repo(ExpenseClaim).create({ claimNumber: `EXP-${String(claimNo++).padStart(5, '0')}`, employeeId: e.id, title: claimTitles[category]!, category, amount: between(25, 900) + between(0, 99) / 100, currency: 'USD', expenseDate: date, merchant: pick(['Uber', 'Delta', 'WeWork', 'Figma', 'AWS Summit', 'Comcast']), status, submittedAt: new Date(`${date}T18:00:00`), reimbursedAt: status === ExpenseStatus.REIMBURSED ? new Date(`${addDays(date, 10)}T12:00:00`) : null, paymentReference: status === ExpenseStatus.REIMBURSED ? `PAY-${between(100000, 999999)}` : null, decisionNote: status === ExpenseStatus.REJECTED ? 'Missing itemised receipt' : null }));
  }
  await repo(ExpenseClaim).save(history);
  const expenses = app.get(ExpensesService);
  await expenses.create(as('sofia'), { title: 'Taxi to client workshop', category: ExpenseCategory.TRAVEL, amount: 64.5, expenseDate: addDays(TODAY, -3), merchant: 'Uber', description: 'Round trip to Globex HQ for the integration workshop.' });
  await expenses.create(as('ethan'), { title: 'Mechanical keyboard', category: ExpenseCategory.EQUIPMENT, amount: 149, expenseDate: addDays(TODAY, -6), merchant: 'Amazon' });
  const bigClaim = await expenses.create(as('jessica'), { title: 'Enterprise client summit — Singapore', category: ExpenseCategory.TRAVEL, amount: 3480, expenseDate: addDays(TODAY, -8), merchant: 'Singapore Airlines', description: 'Flights and hotel for the APAC customer summit.' });
  await app.get(WorkflowService).decide(bigClaim.approvalRequestId!, as('william'), StepStatus.APPROVED, 'Approved — strategic account.');
  const lucasClaim = await expenses.create(as('lucas'), { title: 'Testing devices', category: ExpenseCategory.EQUIPMENT, amount: 420, expenseDate: addDays(TODAY, -4), merchant: 'Apple Store' });
  await app.get(WorkflowService).decide(lucasClaim.approvalRequestId!, as('daniel'), StepStatus.APPROVED, 'Needed for mobile QA.');
  log(`${history.length + 4} expense claims (4 in approval: manager, skip-level and finance stages)`);

  // ── Assets ────────────────────────────────────────────
  let tag = 1;
  const assets: Asset[] = [];
  const assignments: AssetAssignment[] = [];
  for (const [, e] of active.filter(([, e]) => e.dateOfJoining <= TODAY)) {
    const laptop = repo(Asset).create({ id: randomUUID(), assetTag: `SEG-LT-${String(tag++).padStart(4, '0')}`, name: pick(['MacBook Pro 14"', 'MacBook Pro 16"', 'ThinkPad X1 Carbon', 'Dell XPS 15']), category: AssetCategory.LAPTOP, brand: pick(['Apple', 'Lenovo', 'Dell']), serialNumber: `SN${between(10000000, 99999999)}`, purchaseDate: addDays(e.dateOfJoining, -7), purchaseCost: between(1400, 3200), warrantyUntil: addDays(e.dateOfJoining, 1088), status: AssetStatus.ASSIGNED, condition: pick([AssetCondition.GOOD, AssetCondition.NEW, AssetCondition.GOOD]), assignedToId: e.id, assignedAt: new Date(`${e.dateOfJoining}T09:00:00`) });
    assets.push(laptop);
    assignments.push(repo(AssetAssignment).create({ assetId: laptop.id, employeeId: e.id, assignedAt: laptop.assignedAt! }));
    if (rand() < 0.5) {
      const monitor = repo(Asset).create({ id: randomUUID(), assetTag: `SEG-MN-${String(tag++).padStart(4, '0')}`, name: 'Dell UltraSharp 27" Monitor', category: AssetCategory.MONITOR, brand: 'Dell', serialNumber: `MN${between(1000000, 9999999)}`, purchaseDate: addDays(e.dateOfJoining, -7), purchaseCost: 420, status: AssetStatus.ASSIGNED, condition: AssetCondition.GOOD, assignedToId: e.id, assignedAt: new Date(`${e.dateOfJoining}T09:00:00`) });
      assets.push(monitor);
      assignments.push(repo(AssetAssignment).create({ assetId: monitor.id, employeeId: e.id, assignedAt: monitor.assignedAt! }));
    }
  }
  for (let i = 0; i < 8; i++) {
    assets.push(repo(Asset).create({ assetTag: `SEG-SP-${String(tag++).padStart(4, '0')}`, name: pick(['MacBook Air 13"', 'iPhone 15', 'Logitech MX Keys', 'Jabra Evolve2 Headset']), category: pick([AssetCategory.LAPTOP, AssetCategory.PHONE, AssetCategory.PERIPHERAL]), brand: pick(['Apple', 'Logitech', 'Jabra']), serialNumber: `SP${between(1000000, 9999999)}`, purchaseDate: addDays(TODAY, -between(30, 400)), purchaseCost: between(90, 1600), status: i < 6 ? AssetStatus.AVAILABLE : AssetStatus.IN_REPAIR, condition: i < 6 ? AssetCondition.NEW : AssetCondition.FAIR }));
  }
  await repo(Asset).save(assets, { chunk: 100 });
  await repo(AssetAssignment).save(assignments, { chunk: 100 });
  log(`${assets.length} assets`);

  // ── Helpdesk ──────────────────────────────────────────
  const ticketDefs: [string, string, TicketCategory, TicketPriority, TicketStatus, string | null][] = [
    ['sofia', 'Payslip shows incorrect tax withholding', TicketCategory.PAYROLL, TicketPriority.HIGH, TicketStatus.IN_PROGRESS, 'rahul'],
    ['ethan', 'VPN disconnects every 30 minutes', TicketCategory.IT_SUPPORT, TicketPriority.MEDIUM, TicketStatus.OPEN, 'samuel'],
    ['meera', 'How do I update my emergency contact?', TicketCategory.GENERAL, TicketPriority.LOW, TicketStatus.RESOLVED, 'kavya'],
    ['tom', 'Request for employment verification letter', TicketCategory.DOCUMENTS, TicketPriority.MEDIUM, TicketStatus.WAITING_ON_EMPLOYEE, 'oliverb'],
    ['zara', 'Health insurance card not received', TicketCategory.BENEFITS, TicketPriority.MEDIUM, TicketStatus.OPEN, null],
    ['aditya', 'Laptop keyboard not working', TicketCategory.IT_SUPPORT, TicketPriority.URGENT, TicketStatus.OPEN, null],
    ['ryan', 'Clarification on hybrid work anchor days', TicketCategory.POLICY, TicketPriority.LOW, TicketStatus.CLOSED, 'kavya'],
    ['nikhil', 'Leave balance not updated after cancellation', TicketCategory.LEAVE_ATTENDANCE, TicketPriority.MEDIUM, TicketStatus.RESOLVED, 'kavya'],
  ];
  let tn = 1001;
  for (const [by, subject, category, priority, status, assignee] of ticketDefs) {
    const createdAt = new Date(Date.now() - between(1, 12) * 864e5);
    const resolved = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
    const t = await repo(Ticket).save(repo(Ticket).create({ ticketNumber: `HD-${tn++}`, subject, description: `${subject}. Please help — details are in my profile. Thanks!`, category, priority, status, raisedById: emp.get(by)!.id, assigneeId: assignee ? emp.get(assignee)!.id : null, slaDueAt: new Date(createdAt.getTime() + SLA_HOURS[priority] * 36e5), resolvedAt: resolved ? new Date(createdAt.getTime() + between(2, 40) * 36e5) : null, satisfaction: status === TicketStatus.CLOSED ? 5 : null }));
    await repo(Ticket).update(t.id, { createdAt });
    if (assignee) {
      await repo(TicketComment).save([
        repo(TicketComment).create({ ticketId: t.id, authorId: emp.get(assignee)!.id, message: 'Thanks for reaching out — I am looking into this now.' }),
        repo(TicketComment).create({ ticketId: t.id, authorId: emp.get(assignee)!.id, message: 'Checked with the vendor; awaiting confirmation.', isInternal: true }),
      ]);
    }
  }
  log(`${ticketDefs.length} helpdesk tickets`);

  // ── Engagement & comms ────────────────────────────────
  await repo(Announcement).save([
    repo(Announcement).create({ title: `H2 ${YEAR} performance reviews are open`, content: `Self-reviews are due by ${addDays(TODAY, 14)}. Take time to reflect on your goals and competencies — managers will complete their reviews two weeks later.`, category: AnnouncementCategory.POLICY, isPinned: true, publishedAt: new Date(`${addDays(TODAY, -1)}T09:00:00`), authorId: emp.get('hrd')!.id }),
    repo(Announcement).create({ title: 'Segue Foundation Day — October 16', content: 'We are celebrating 8 years of Segue! All offices are closed on Foundation Day. Join the global town hall the day before at 15:00 IST / 10:30 BST.', category: AnnouncementCategory.EVENT, publishedAt: new Date(`${addDays(TODAY, -3)}T09:00:00`), authorId: emp.get('ceo')!.id }),
    repo(Announcement).create({ title: 'Welcome Hannah and Kabir to Engineering!', content: 'Please give a warm welcome to Hannah Lee (NYC) and Kabir Mehra (Bengaluru), who are joining our Engineering teams.', category: AnnouncementCategory.CELEBRATION, publishedAt: new Date(`${addDays(TODAY, -2)}T09:00:00`), authorId: emp.get('hrd')!.id }),
    repo(Announcement).create({ title: 'Updated Information Security Policy (v2.4)', content: 'The Information Security Policy has been updated with new MFA requirements. Please read and acknowledge it in Documents by the end of the month.', category: AnnouncementCategory.POLICY, publishedAt: new Date(`${addDays(TODAY, -6)}T09:00:00`), authorId: emp.get('marcus')!.id }),
    repo(Announcement).create({ title: 'Engineering all-hands moved to Thursday', content: 'This week’s engineering all-hands moves to Thursday 17:00 IST due to the release freeze.', category: AnnouncementCategory.GENERAL, publishedAt: new Date(`${addDays(TODAY, -4)}T09:00:00`), departmentId: departments.get('ENG')!.id, authorId: emp.get('vpe')!.id }),
  ]);

  const kudosDefs: [string, string, KudosBadge, string][] = [
    ['daniel', 'sofia', KudosBadge.ABOVE_AND_BEYOND, 'Led the payroll-export migration over the weekend with zero downtime. Legend!'],
    ['jessica', 'weiling', KudosBadge.TEAM_PLAYER, 'Covered three client calls for me while I was travelling. Thank you!'],
    ['grace', 'chloe', KudosBadge.INNOVATOR, 'The new approvals inbox design is a game changer for managers.'],
    ['carlos', 'fatima', KudosBadge.CUSTOMER_HERO, 'Turned a frustrated customer into a vocal advocate in one call.'],
    ['ananya', 'rohan', KudosBadge.MENTOR, 'Your architecture sessions have levelled up the whole team.'],
    ['hrd', 'aisha', KudosBadge.ABOVE_AND_BEYOND, 'Closed 4 critical hires this quarter. Incredible pipeline work.'],
    ['sofia', 'hannah', KudosBadge.TEAM_PLAYER, 'Great first week — already shipped a bug fix!'],
    ['marcus', 'deepak', KudosBadge.CUSTOMER_HERO, 'Had 40 new laptops imaged and shipped ahead of schedule.'],
    ['william', 'olivia', KudosBadge.LEADERSHIP, 'The APAC launch campaign exceeded pipeline targets by 30%.'],
    ['vpe', 'arnav', KudosBadge.INNOVATOR, 'Cut our CI time in half with the new build cache.'],
  ];
  await repo(Kudos).save(kudosDefs.map(([f, t, badge, message], i) => repo(Kudos).create({ fromId: emp.get(f)!.id, toId: emp.get(t)!.id, badge, message, likes: active.slice(i, i + between(2, 9)).map(([, e]) => e.id) })));

  const pulse = await repo(Survey).save(repo(Survey).create({
    title: `Q3 ${YEAR} Pulse Survey`, description: 'Five quick questions about how work is going. Anonymous.', status: SurveyStatus.ACTIVE, isAnonymous: true, closesOn: addDays(TODAY, 7), createdById: emp.get('hrd')!.id,
    questions: [
      { id: 'enps', text: 'How likely are you to recommend Segue as a place to work?', type: 'ENPS', required: true },
      { id: 'workload', text: 'My workload is manageable.', type: 'RATING', required: true },
      { id: 'manager', text: 'My manager gives me useful feedback.', type: 'RATING', required: true },
      { id: 'mode', text: 'Which work arrangement do you prefer?', type: 'CHOICE', options: ['Fully remote', 'Hybrid', 'Office-first'] },
      { id: 'comment', text: 'What is one thing we should improve?', type: 'TEXT' },
    ],
  }));
  const comments = ['More focus time with fewer meetings', 'Clearer career ladders for ICs', 'Faster laptop refresh cycle', 'Better cross-team documentation', 'More learning budget'];
  const responders = active.filter(([key]) => !['sofia', 'daniel', 'hrd', 'ceo'].includes(key)).slice(0, 26);
  await repo(SurveyResponse).save(responders.map(([, e]) => repo(SurveyResponse).create({
    surveyId: pulse.id, respondentKey: randomUUID().replace(/-/g, ''), departmentId: e.departmentId,
    answers: { enps: pick([5, 6, 7, 8, 8, 9, 9, 9, 10, 10]), workload: between(2, 5), manager: between(3, 5), mode: pick(['Hybrid', 'Hybrid', 'Fully remote', 'Office-first']), comment: rand() < 0.5 ? pick(comments) : '' },
  })));
  log(`5 announcements, ${kudosDefs.length} kudos, pulse survey with ${responders.length} responses`);

  // ── Documents ─────────────────────────────────────────
  const docs = await repo(Document).save(POLICIES.map((p) => repo(Document).create({ ...p, category: p.category as DocumentCategory, uploadedById: emp.get('hrd')!.id })));
  const acks: DocumentAcknowledgment[] = [];
  for (const d of docs.filter((d) => d.requiresAcknowledgment)) {
    for (const [key, e] of active) {
      if (key === 'sofia' || rand() < 0.25) continue;
      acks.push(repo(DocumentAcknowledgment).create({ documentId: d.id, employeeId: e.id, version: d.version }));
    }
  }
  await repo(DocumentAcknowledgment).save(acks, { chunk: 200 });
  await repo(Document).save(repo(Document).create({ title: 'Offer Letter', category: DocumentCategory.LETTER, employeeId: emp.get('sofia')!.id, content: 'Offer of employment — Senior Software Engineer.', uploadedById: emp.get('hrd')!.id }));
  log(`${docs.length} policies, ${acks.length} acknowledgments`);

  // ── Separations ───────────────────────────────────────
  const offboarding = app.get(OffboardingService);
  const workflow = app.get(WorkflowService);
  const tomSep = await offboarding.resign(as('tom'), { reason: 'I have accepted an offer to relocate closer to family in Manchester. Thank you for a wonderful few years.', requestedLastDay: addDays(TODAY, 30) });
  await workflow.decide(tomSep.approvalRequestId!, as('william'), StepStatus.APPROVED, 'Sad to see Tom go — happy to support.');
  const benSep = await offboarding.resign(as('benjamin'), { reason: 'Pursuing a full-time MBA starting next term.', requestedLastDay: addDays(TODAY, 21) });
  await workflow.decide(benSep.approvalRequestId!, as('emily'), StepStatus.APPROVED);
  await workflow.decide(benSep.approvalRequestId!, as('hrd'), StepStatus.APPROVED, 'Last working day confirmed.');
  for (const key of ['jason', 'sara']) {
    const e = emp.get(key)!;
    await repo(Separation).save(repo(Separation).create({ employeeId: e.id, type: SeparationType.RESIGNATION, reason: key === 'jason' ? 'Joining a startup as founding engineer.' : 'Career change into consulting.', noticeDate: addDays(e.dateOfExit!, -30), requestedLastDay: e.dateOfExit!, approvedLastDay: e.dateOfExit!, status: SeparationStatus.COMPLETED, completedAt: new Date(`${e.dateOfExit}T18:00:00`), isRehireEligible: true, exitInterview: { overallRating: 4, primaryReason: key === 'jason' ? 'Career growth' : 'Career change', wouldRecommend: true, feedback: 'Great team and culture. Would love more structured career paths.', submittedAt: `${e.dateOfExit}T10:00:00` } }));
  }
  log('2 active separations (1 pending HR approval, 1 serving notice) + 2 completed exits');

  // ── Tidy notifications: keep only the latest few unread per user ──
  const notes = await repo(Notification).find({ order: { createdAt: 'DESC' } });
  const seen = new Map<string, number>();
  const toRead: string[] = [];
  for (const n of notes) {
    const count = (seen.get(n.userId) ?? 0) + 1;
    seen.set(n.userId, count);
    if (count > 4) toRead.push(n.id);
  }
  for (let i = 0; i < toRead.length; i += 500) await repo(Notification).update({ id: In(toRead.slice(i, i + 500)) }, { isRead: true });

  await app.close();
  console.log(`\n✔ Seed complete. Sign in with any of these (password: ${DEMO_PASSWORD}):`);
  console.table([
    { role: 'Super Admin (CEO)', email: 'admin@segueit.com' },
    { role: 'HR Admin', email: 'hr@segueit.com' },
    { role: 'Manager', email: 'manager@segueit.com' },
    { role: 'Employee', email: 'employee@segueit.com' },
    { role: 'Payroll Admin', email: 'payroll@segueit.com' },
    { role: 'Finance', email: 'finance@segueit.com' },
    { role: 'Recruiter', email: 'recruiter@segueit.com' },
    { role: 'IT Admin', email: 'it@segueit.com' },
  ]);
}

main().catch((err) => {
  console.error('\n✖ Seed failed:', err);
  process.exit(1);
});
