import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { assertPermission, AuthUser, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { todayISO } from '../../common/utils/dates.js';
import { applyScope } from '../../common/utils/scope.js';
import { EmployeesService } from '../employees/employees.service.js';
import { EMPLOYED_STATUSES, EmployeeStatus } from '../employees/entities/employee.entity.js';
import { JourneyType } from '../onboarding/entities/journey-template.entity.js';
import { OnboardingService } from '../onboarding/onboarding.service.js';
import { UsersService } from '../users/users.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { RequestStatus, WORKFLOW_DECIDED, WorkflowType } from '../workflow/workflow.types.js';
import type { WorkflowDecidedEvent } from '../workflow/workflow.types.js';
import {
  CompleteSeparationDto,
  ExitInterviewDto,
  InitiateSeparationDto,
  ResignDto,
  SeparationQueryDto,
} from './dto/offboarding.dto.js';
import { Separation, SeparationStatus, SeparationType } from './entities/separation.entity.js';

const OPEN = [SeparationStatus.PENDING_APPROVAL, SeparationStatus.APPROVED];

@Injectable()
export class OffboardingService {
  constructor(
    @InjectRepository(Separation) private readonly repo: Repository<Separation>,
    private readonly employees: EmployeesService,
    private readonly users: UsersService,
    private readonly journeys: OnboardingService,
    private readonly workflow: WorkflowService,
  ) {}

  private async assertNoOpenSeparation(employeeId: string) {
    if (await this.repo.exists({ where: { employeeId, status: In(OPEN) } })) {
      throw new BadRequestException('There is already an active separation for this employee');
    }
  }

  async resign(user: AuthUser, dto: ResignDto) {
    const employeeId = requireEmployeeId(user);
    const employee = await this.employees.getEntity(employeeId);
    if (!EMPLOYED_STATUSES.includes(employee.status)) throw new BadRequestException('You are not currently employed');
    if (dto.requestedLastDay < todayISO()) throw new BadRequestException('Last working day cannot be in the past');
    await this.assertNoOpenSeparation(employeeId);

    const sep = await this.repo.save(
      this.repo.create({
        employeeId,
        type: SeparationType.RESIGNATION,
        reason: dto.reason,
        noticeDate: todayISO(),
        requestedLastDay: dto.requestedLastDay,
        status: SeparationStatus.PENDING_APPROVAL,
        initiatedById: employeeId,
      }),
    );
    const approval = await this.workflow.submit({
      type: WorkflowType.SEPARATION,
      entityId: sep.id,
      requesterId: employeeId,
      title: `Resignation · ${employee.fullName}`,
      summary: dto.reason,
      link: '/offboarding',
      metadata: { lastWorkingDay: dto.requestedLastDay, designation: employee.designation?.title ?? null },
    });
    await this.repo.update(sep.id, { approvalRequestId: approval.id });
    return this.get(sep.id);
  }

  /** HR-initiated separation (termination, retirement, contract end) — pre-approved. */
  async initiate(dto: InitiateSeparationDto, user: AuthUser) {
    await this.employees.getEntity(dto.employeeId);
    await this.assertNoOpenSeparation(dto.employeeId);
    const sep = await this.repo.save(
      this.repo.create({
        employeeId: dto.employeeId,
        type: dto.type,
        reason: dto.reason,
        noticeDate: todayISO(),
        requestedLastDay: dto.lastDay,
        status: SeparationStatus.PENDING_APPROVAL,
        initiatedById: user.employeeId,
      }),
    );
    await this.approve(sep, user.employeeId);
    return this.get(sep.id);
  }

  private async approve(sep: Separation, actorId: string | null) {
    await this.repo.update(sep.id, { status: SeparationStatus.APPROVED, approvedLastDay: sep.requestedLastDay });
    await this.employees.setStatus(sep.employeeId, EmployeeStatus.NOTICE_PERIOD, actorId);
    await this.journeys
      .start({ employeeId: sep.employeeId, type: JourneyType.OFFBOARDING, startDate: sep.requestedLastDay, separationId: sep.id })
      .catch(() => undefined); // no offboarding template configured
  }

  @OnEvent(WORKFLOW_DECIDED)
  async onDecision(event: WorkflowDecidedEvent) {
    if (event.type !== WorkflowType.SEPARATION) return;
    const sep = await this.repo.findOne({ where: { id: event.entityId } });
    if (!sep || sep.status !== SeparationStatus.PENDING_APPROVAL) return;
    if (event.status === RequestStatus.APPROVED) await this.approve(sep, event.decidedByEmployeeId);
    else await this.repo.update(sep.id, { status: SeparationStatus.REJECTED });
  }

  async withdraw(id: string, user: AuthUser) {
    const sep = await this.get(id);
    if (sep.employeeId !== user.employeeId) assertPermission(user, Permission.OFFBOARDING_MANAGE);
    if (sep.status === SeparationStatus.PENDING_APPROVAL) {
      await this.workflow.cancelForEntity(WorkflowType.SEPARATION, id);
    } else if (sep.status === SeparationStatus.APPROVED) {
      await this.employees.setStatus(sep.employeeId, EmployeeStatus.ACTIVE, user.employeeId);
      await this.journeys.cancelForSeparation(id);
    } else {
      throw new BadRequestException('This separation can no longer be withdrawn');
    }
    await this.repo.update(id, { status: SeparationStatus.WITHDRAWN });
    return this.get(id);
  }

  async exitInterview(id: string, dto: ExitInterviewDto, user: AuthUser) {
    const sep = await this.get(id);
    if (sep.employeeId !== user.employeeId) assertPermission(user, Permission.OFFBOARDING_MANAGE);
    await this.repo.update(id, { exitInterview: { ...dto, submittedAt: new Date().toISOString() } });
    return this.get(id);
  }

  /** Final exit: deactivate the employee and their login. */
  async complete(id: string, dto: CompleteSeparationDto, user: AuthUser) {
    const sep = await this.get(id);
    if (sep.status !== SeparationStatus.APPROVED) throw new BadRequestException('Only approved separations can be completed');
    const lastDay = sep.approvedLastDay ?? sep.requestedLastDay;
    await this.employees.setStatus(sep.employeeId, EmployeeStatus.EXITED, user.employeeId, { dateOfExit: lastDay });
    await this.users.deactivateByEmployee(sep.employeeId);
    await this.repo.update(id, {
      status: SeparationStatus.COMPLETED,
      completedAt: new Date(),
      isRehireEligible: dto.isRehireEligible ?? null,
    });
    return this.get(id);
  }

  async get(id: string) {
    const sep = await this.repo.findOne({
      where: { id },
      relations: { employee: { designation: true, department: true, manager: true } },
    });
    if (!sep) throw new NotFoundException('Separation not found');
    return sep;
  }

  async list(user: AuthUser, query: SeparationQueryDto) {
    const qb = this.repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.employee', 'e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.department', 'department')
      .orderBy('s.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    applyScope(qb, { scope: query.scope, user, employeeAlias: 'e', permission: Permission.OFFBOARDING_MANAGE });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }
}
