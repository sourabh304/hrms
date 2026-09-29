import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission, Role } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { EmployeesService } from '../employees/employees.service.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import { PayrollService } from '../payroll/payroll.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { RequestStatus, WORKFLOW_DECIDED, WorkflowType } from '../workflow/workflow.types.js';
import type { WorkflowDecidedEvent } from '../workflow/workflow.types.js';
import {
  ApplicationQueryDto,
  CandidateQueryDto,
  CreateApplicationDto,
  CreateCandidateDto,
  CreateJobDto,
  HireDto,
  InterviewFeedbackDto,
  JobQueryDto,
  MoveStageDto,
  PublicApplyDto,
  ReferralDto,
  ScheduleInterviewDto,
  UpdateCandidateDto,
  UpdateInterviewDto,
  UpdateJobDto,
} from './dto/recruitment.dto.js';
import { Candidate, CandidateSource } from './entities/candidate.entity.js';
import { Interview, InterviewStatus } from './entities/interview.entity.js';
import { ACTIVE_STAGES, ApplicationStage, JobApplication } from './entities/job-application.entity.js';
import { JobOpening, JobStatus } from './entities/job-opening.entity.js';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(JobOpening) private readonly jobs: Repository<JobOpening>,
    @InjectRepository(Candidate) private readonly candidates: Repository<Candidate>,
    @InjectRepository(JobApplication) private readonly applications: Repository<JobApplication>,
    @InjectRepository(Interview) private readonly interviews: Repository<Interview>,
    private readonly employees: EmployeesService,
    private readonly org: OrganizationService,
    private readonly payroll: PayrollService,
    private readonly workflow: WorkflowService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Jobs ─────────────────────────────────────────────

  private async nextJobCode() {
    const rows = await this.jobs.createQueryBuilder('j').select('j.code', 'code').getRawMany<{ code: string }>();
    const max = rows.reduce((m, r) => Math.max(m, Number(r.code.split('-').pop()) || 1000), 1000);
    return `REQ-${max + 1}`;
  }

  private async stageCounts(jobIds: string[]) {
    if (!jobIds.length) return new Map<string, Record<string, number>>();
    const rows = await this.applications
      .createQueryBuilder('a')
      .select('a.jobId', 'jobId')
      .addSelect('a.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('a.jobId IN (:...ids)', { ids: jobIds })
      .groupBy('a.jobId')
      .addGroupBy('a.stage')
      .getRawMany<{ jobId: string; stage: string; count: string }>();
    const map = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const m = map.get(r.jobId) ?? {};
      m[r.stage] = Number(r.count);
      map.set(r.jobId, m);
    }
    return map;
  }

  async listJobs(user: AuthUser, query: JobQueryDto) {
    const qb = this.jobs
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.department', 'department')
      .leftJoinAndSelect('j.location', 'location')
      .leftJoinAndSelect('j.hiringManager', 'hm')
      .leftJoinAndSelect('j.recruiter', 'rec')
      .orderBy('j.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);

    if (query.view === 'board') {
      qb.andWhere('j.status = :open', { open: JobStatus.OPEN });
    } else if (!hasPermission(user, Permission.RECRUITMENT_MANAGE)) {
      // Hiring managers see the requisitions they own.
      qb.andWhere('j.hiringManagerId = :me', { me: requireEmployeeId(user) });
    }
    if (query.status) qb.andWhere('j.status = :status', { status: query.status });
    if (query.departmentId) qb.andWhere('j.departmentId = :d', { d: query.departmentId });
    if (query.search) {
      qb.andWhere('(LOWER(j.title) LIKE :s OR LOWER(j.code) LIKE :s)', { s: `%${query.search.toLowerCase()}%` });
    }
    const [rows, total] = await qb.getManyAndCount();
    const counts = await this.stageCounts(rows.map((r) => r.id));
    const data = rows.map((j) => {
      const c = counts.get(j.id) ?? {};
      return {
        ...j,
        pipeline: c,
        applicants: Object.values(c).reduce((s, n) => s + n, 0),
        active: ACTIVE_STAGES.reduce((s, st) => s + (c[st] ?? 0), 0),
      };
    });
    return paginated(data, total, query);
  }

  async getJob(id: string) {
    const job = await this.jobs.findOne({
      where: { id },
      relations: { department: true, designation: true, location: true, hiringManager: true, recruiter: true },
    });
    if (!job) throw new NotFoundException('Job opening not found');
    const counts = (await this.stageCounts([id])).get(id) ?? {};
    return { ...job, pipeline: counts };
  }

  async createJob(dto: CreateJobDto, user: AuthUser) {
    const { submitForApproval, ...data } = dto;
    const job = await this.jobs.save(
      this.jobs.create({
        ...data,
        code: await this.nextJobCode(),
        hiringManagerId: data.hiringManagerId ?? user.employeeId,
        createdById: user.employeeId,
        status: JobStatus.DRAFT,
      }),
    );
    if (submitForApproval) return this.submitJob(job.id, user);
    return this.getJob(job.id);
  }

  async updateJob(id: string, dto: UpdateJobDto) {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job opening not found');
    await this.jobs.save(Object.assign(job, dto));
    return this.getJob(id);
  }

  async submitJob(id: string, user: AuthUser) {
    const job = await this.jobs.findOne({ where: { id }, relations: { department: true } });
    if (!job) throw new NotFoundException('Job opening not found');
    if (job.status !== JobStatus.DRAFT) throw new BadRequestException('Only draft requisitions can be submitted');
    await this.jobs.update(id, { status: JobStatus.PENDING_APPROVAL });
    const approval = await this.workflow.submit({
      type: WorkflowType.JOB_REQUISITION,
      entityId: job.id,
      requesterId: requireEmployeeId(user),
      title: `New headcount: ${job.title}`,
      summary: `${job.openings} opening(s) in ${job.department?.name ?? 'the organization'}`,
      link: `/recruitment/jobs/${job.id}`,
      metadata: {
        code: job.code,
        openings: job.openings,
        department: job.department?.name ?? null,
        salaryRange: job.salaryMin && job.salaryMax ? `${job.salaryMin}–${job.salaryMax}` : null,
      },
    });
    await this.jobs.update(id, { approvalRequestId: approval.id });
    return this.getJob(id);
  }

  @OnEvent(WORKFLOW_DECIDED)
  async onDecision(event: WorkflowDecidedEvent) {
    if (event.type !== WorkflowType.JOB_REQUISITION) return;
    const job = await this.jobs.findOne({ where: { id: event.entityId } });
    if (!job || job.status !== JobStatus.PENDING_APPROVAL) return;
    if (event.status === RequestStatus.APPROVED) {
      await this.jobs.update(job.id, { status: JobStatus.OPEN, postedAt: new Date() });
    } else {
      await this.jobs.update(job.id, { status: JobStatus.CANCELLED });
    }
  }

  async setJobStatus(id: string, status: JobStatus) {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job opening not found');
    if ([JobStatus.DRAFT, JobStatus.PENDING_APPROVAL].includes(job.status) && status === JobStatus.OPEN) {
      throw new BadRequestException('Requisition must be approved before it can open');
    }
    await this.jobs.update(id, { status, postedAt: status === JobStatus.OPEN ? (job.postedAt ?? new Date()) : job.postedAt });
    return this.getJob(id);
  }

  // ── Candidates ───────────────────────────────────────

  async listCandidates(query: CandidateQueryDto) {
    const qb = this.candidates
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.referredBy', 'ref')
      .orderBy('c.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.source) qb.andWhere('c.source = :src', { src: query.source });
    if (query.search) {
      qb.andWhere(
        '(LOWER(c.firstName) LIKE :s OR LOWER(c.lastName) LIKE :s OR LOWER(c.email) LIKE :s OR LOWER(c.currentTitle) LIKE :s)',
        { s: `%${query.search.toLowerCase()}%` },
      );
    }
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async getCandidate(id: string) {
    const candidate = await this.candidates.findOne({ where: { id }, relations: { referredBy: true } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const applications = await this.applications.find({
      where: { candidateId: id },
      relations: { job: true, interviews: { interviewer: true } },
      order: { appliedAt: 'DESC' },
    });
    return { ...candidate, applications };
  }

  async createCandidate(dto: CreateCandidateDto, referredById: string | null = null) {
    const { jobId, ...data } = dto;
    const email = data.email.toLowerCase();
    let candidate = await this.candidates.findOne({ where: { email } });
    if (!candidate) {
      candidate = await this.candidates.save(this.candidates.create({ ...data, email, referredById }));
    }
    if (jobId) await this.createApplication({ jobId, candidateId: candidate.id });
    return this.getCandidate(candidate.id);
  }

  async updateCandidate(id: string, dto: UpdateCandidateDto) {
    const c = await this.candidates.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Candidate not found');
    await this.candidates.save(Object.assign(c, dto));
    return this.getCandidate(id);
  }

  // ── Applications / pipeline ──────────────────────────

  async createApplication(dto: CreateApplicationDto & { coverLetter?: string }) {
    const job = await this.jobs.findOne({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException('Job opening not found');
    if (await this.applications.exists({ where: { jobId: dto.jobId, candidateId: dto.candidateId } })) {
      throw new BadRequestException('Candidate has already applied to this job');
    }
    const now = new Date();
    return this.applications.save(
      this.applications.create({
        ...dto,
        stage: ApplicationStage.APPLIED,
        appliedAt: now,
        stageChangedAt: now,
      }),
    );
  }

  async listApplications(query: ApplicationQueryDto) {
    const qb = this.applications
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.candidate', 'c')
      .leftJoinAndSelect('a.job', 'j')
      .leftJoinAndSelect('a.interviews', 'i')
      .orderBy('a.stageChangedAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    if (query.jobId) qb.andWhere('a.jobId = :jobId', { jobId: query.jobId });
    if (query.stage) qb.andWhere('a.stage = :stage', { stage: query.stage });
    if (query.search) {
      qb.andWhere('(LOWER(c.firstName) LIKE :s OR LOWER(c.lastName) LIKE :s OR LOWER(c.email) LIKE :s)', {
        s: `%${query.search.toLowerCase()}%`,
      });
    }
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  /** Kanban board for one job. */
  async pipeline(jobId: string) {
    const apps = await this.applications.find({
      where: { jobId },
      relations: { candidate: true, interviews: true },
      order: { stageChangedAt: 'DESC' },
    });
    const stages = Object.values(ApplicationStage);
    return stages.map((stage) => ({ stage, applications: apps.filter((a) => a.stage === stage) }));
  }

  async moveStage(id: string, dto: MoveStageDto) {
    const app = await this.applications.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.stage === ApplicationStage.HIRED) throw new BadRequestException('Candidate has already been hired');
    if (dto.stage === ApplicationStage.HIRED) throw new BadRequestException('Use the hire action to hire a candidate');
    if (dto.stage === ApplicationStage.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('A rejection reason is required');
    }
    Object.assign(app, {
      stage: dto.stage,
      stageChangedAt: new Date(),
      notes: dto.notes ?? app.notes,
      rejectionReason: dto.rejectionReason ?? app.rejectionReason,
      offeredSalary: dto.offeredSalary ?? app.offeredSalary,
    });
    return this.applications.save(app);
  }

  async rate(id: string, rating: number) {
    await this.applications.update(id, { rating });
    return this.applications.findOne({ where: { id } });
  }

  /** Convert an offer into an employee record (triggers onboarding). */
  async hire(id: string, dto: HireDto, user: AuthUser) {
    const app = await this.applications.findOne({ where: { id }, relations: { candidate: true, job: true } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.stage !== ApplicationStage.OFFER) throw new BadRequestException('Only candidates at the offer stage can be hired');

    const c = app.candidate;
    const { emailDomain } = await this.org.getSettings();
    const employee = await this.employees.create(
      {
        firstName: c.firstName,
        lastName: c.lastName,
        workEmail: dto.workEmail ?? `${c.firstName}.${c.lastName}@${emailDomain}`.toLowerCase().replace(/\s+/g, ''),
        personalEmail: c.email,
        phone: c.phone ?? undefined,
        skills: c.skills ?? undefined,
        departmentId: dto.departmentId ?? app.job.departmentId,
        designationId: dto.designationId ?? app.job.designationId,
        locationId: dto.locationId ?? app.job.locationId,
        managerId: dto.managerId ?? app.job.hiringManagerId,
        employmentType: app.job.employmentType,
        workMode: app.job.workMode,
        dateOfJoining: dto.dateOfJoining,
        createUserAccount: dto.createUserAccount ?? true,
        roles: [Role.EMPLOYEE],
      },
      user,
    );
    if (app.offeredSalary) {
      await this.payroll.upsertStructure(employee.id, { annualCtc: app.offeredSalary, effectiveFrom: dto.dateOfJoining }, user);
    }

    await this.applications.update(id, {
      stage: ApplicationStage.HIRED,
      stageChangedAt: new Date(),
      hiredEmployeeId: employee.id,
    });
    const filled = app.job.filled + 1;
    await this.jobs.update(app.jobId, {
      filled,
      status: filled >= app.job.openings ? JobStatus.CLOSED : app.job.status,
    });
    return { application: await this.applications.findOne({ where: { id } }), employee };
  }

  // ── Interviews ───────────────────────────────────────

  async scheduleInterview(applicationId: string, dto: ScheduleInterviewDto) {
    const app = await this.applications.findOne({ where: { id: applicationId }, relations: { candidate: true, job: true } });
    if (!app) throw new NotFoundException('Application not found');
    const interview = await this.interviews.save(
      this.interviews.create({ ...dto, applicationId, scheduledAt: new Date(dto.scheduledAt) }),
    );
    if (app.stage === ApplicationStage.APPLIED || app.stage === ApplicationStage.SCREENING) {
      await this.applications.update(applicationId, { stage: ApplicationStage.INTERVIEW, stageChangedAt: new Date() });
    }
    await this.notifications.notifyEmployees([dto.interviewerId], {
      title: `Interview scheduled: ${app.candidate.fullName}`,
      message: `${dto.round} for ${app.job.title} on ${new Date(dto.scheduledAt).toLocaleString()}`,
      type: NotificationType.ACTION,
      link: '/recruitment/interviews',
    });
    return interview;
  }

  myInterviews(user: AuthUser) {
    return this.interviews.find({
      where: { interviewerId: requireEmployeeId(user), scheduledAt: MoreThanOrEqual(new Date(Date.now() - 30 * 864e5)) },
      relations: { application: { candidate: true, job: true } },
      order: { scheduledAt: 'ASC' },
    });
  }

  async submitFeedback(id: string, dto: InterviewFeedbackDto, user: AuthUser) {
    const interview = await this.interviews.findOne({ where: { id } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.interviewerId !== user.employeeId && !hasPermission(user, Permission.RECRUITMENT_MANAGE)) {
      throw new ForbiddenException('Only the interviewer can submit feedback');
    }
    await this.interviews.update(id, { ...dto, status: InterviewStatus.COMPLETED });
    return this.interviews.findOne({ where: { id } });
  }

  async updateInterview(id: string, dto: UpdateInterviewDto) {
    await this.interviews.update(id, {
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
    });
    return this.interviews.findOne({ where: { id } });
  }

  // ── Referrals & careers site ─────────────────────────

  async refer(dto: ReferralDto, user: AuthUser) {
    const job = await this.jobs.findOne({ where: { id: dto.jobId, status: JobStatus.OPEN } });
    if (!job) throw new BadRequestException('This role is not open for referrals');
    const result = await this.createCandidate(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        linkedinUrl: dto.linkedinUrl,
        notes: dto.note,
        source: CandidateSource.REFERRAL,
        jobId: dto.jobId,
      },
      requireEmployeeId(user),
    );
    await this.notifications.notifyRole(Role.RECRUITER, {
      title: `New referral for ${job.title}`,
      message: `${dto.firstName} ${dto.lastName}`,
      link: `/recruitment/jobs/${job.id}`,
    });
    return result;
  }

  myReferrals(user: AuthUser) {
    return this.candidates.find({
      where: { referredById: requireEmployeeId(user) },
      order: { createdAt: 'DESC' },
    }).then(async (cands) => {
      const apps = cands.length
        ? await this.applications.find({ where: { candidateId: In(cands.map((c) => c.id)) }, relations: { job: true } })
        : [];
      return cands.map((c) => ({ ...c, applications: apps.filter((a) => a.candidateId === c.id) }));
    });
  }

  publicJobs() {
    return this.jobs.find({
      where: { status: JobStatus.OPEN, isPublished: true },
      relations: { department: true, location: true },
      order: { postedAt: 'DESC' },
    }).then((jobs) =>
      jobs.map(({ salaryMin, salaryMax, hiringManagerId, recruiterId, approvalRequestId, createdById, ...pub }) => pub),
    );
  }

  async publicJob(id: string) {
    const job = await this.jobs.findOne({
      where: { id, status: JobStatus.OPEN, isPublished: true },
      relations: { department: true, location: true },
    });
    if (!job) throw new NotFoundException('This position is no longer available');
    const { salaryMin, salaryMax, hiringManagerId, recruiterId, approvalRequestId, createdById, ...pub } = job;
    return pub;
  }

  async publicApply(jobId: string, dto: PublicApplyDto) {
    const job = await this.publicJob(jobId);
    const email = dto.email.toLowerCase();
    let candidate = await this.candidates.findOne({ where: { email } });
    if (!candidate) {
      candidate = await this.candidates.save(
        this.candidates.create({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email,
          phone: dto.phone ?? null,
          resumeUrl: dto.resumeUrl ?? null,
          linkedinUrl: dto.linkedinUrl ?? null,
          experienceYears: dto.experienceYears ?? 0,
          source: CandidateSource.CAREERS_SITE,
        }),
      );
    }
    await this.createApplication({ jobId, candidateId: candidate.id, coverLetter: dto.coverLetter });
    await this.notifications.notifyRole(Role.RECRUITER, {
      title: `New applicant for ${job.title}`,
      message: `${dto.firstName} ${dto.lastName} applied via the careers site`,
      link: `/recruitment/jobs/${jobId}`,
    });
    return { ok: true, message: 'Thank you for applying! Our team will be in touch.' };
  }

  // ── Analytics ────────────────────────────────────────

  async stats(user: AuthUser) {
    assertPermission(user, Permission.RECRUITMENT_MANAGE);
    const [openJobs, funnelRows, hired] = await Promise.all([
      this.jobs.find({ where: { status: JobStatus.OPEN } }),
      this.applications
        .createQueryBuilder('a')
        .select('a.stage', 'stage')
        .addSelect('COUNT(*)', 'count')
        .groupBy('a.stage')
        .getRawMany<{ stage: string; count: string }>(),
      this.applications.find({ where: { stage: ApplicationStage.HIRED } }),
    ]);
    const funnel = Object.fromEntries(funnelRows.map((r) => [r.stage, Number(r.count)]));
    const days = hired.map((a) => (a.stageChangedAt.getTime() - a.appliedAt.getTime()) / 864e5);
    const sources = await this.candidates
      .createQueryBuilder('c')
      .select('c.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.source')
      .getRawMany<{ source: string; count: string }>();
    return {
      openJobs: openJobs.length,
      openPositions: openJobs.reduce((s, j) => s + Math.max(0, j.openings - j.filled), 0),
      funnel,
      avgTimeToHireDays: days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null,
      sources: sources.map((s) => ({ source: s.source, count: Number(s.count) })),
    };
  }
}
