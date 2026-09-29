import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { assertPermission, AuthUser, isSuperAdmin } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Department } from '../organization/entities/department.entity.js';
import { RequestQueryDto, UpdatePolicyDto } from './dto/workflow.dto.js';
import { ApprovalRequest } from './entities/approval-request.entity.js';
import { ApprovalStep } from './entities/approval-step.entity.js';
import { WorkflowPolicy } from './entities/workflow-policy.entity.js';
import {
  ApproverType,
  DEFAULT_POLICIES,
  PolicyCondition,
  RequestStatus,
  StepStatus,
  WORKFLOW_DECIDED,
  WorkflowDecidedEvent,
  WorkflowType,
} from './workflow.types.js';

export interface SubmitRequestInput {
  type: WorkflowType;
  entityId: string;
  requesterId: string;
  title: string;
  summary?: string;
  link?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

type ResolvedStep = Pick<ApprovalStep, 'label' | 'approverType' | 'approverEmployeeId' | 'approverRole'>;

export function evaluateCondition(
  condition: PolicyCondition,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const actual = metadata?.[condition.field];
  if (actual === undefined || actual === null) return false;
  const a = typeof condition.value === 'number' ? Number(actual) : String(actual);
  const b = condition.value;
  switch (condition.operator) {
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'lt': return a < b;
    case 'lte': return a <= b;
    case 'eq': return a === b;
    case 'neq': return a !== b;
  }
}

/**
 * Generic approval engine (business-process framework).
 *
 * Features submit a request for one of their records; the engine resolves the
 * approver chain from the configured policy, routes it through each step and
 * emits WORKFLOW_DECIDED when a terminal decision is reached.
 */
@Injectable()
export class WorkflowService implements OnModuleInit {
  constructor(
    @InjectRepository(WorkflowPolicy) private readonly policies: Repository<WorkflowPolicy>,
    @InjectRepository(ApprovalRequest) private readonly requests: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalStep) private readonly steps: Repository<ApprovalStep>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
  ) {}

  async onModuleInit() {
    for (const def of DEFAULT_POLICIES) {
      const exists = await this.policies.exists({ where: { type: def.type } });
      if (!exists) await this.policies.save(this.policies.create(def));
    }
  }

  // ── Submission ───────────────────────────────────────

  async submit(input: SubmitRequestInput): Promise<ApprovalRequest> {
    const requester = await this.employees.findOne({
      where: { id: input.requesterId },
      relations: { manager: true },
    });
    if (!requester) throw new NotFoundException('Requester not found');

    const policy = await this.policies.findOne({ where: { type: input.type } });
    const chain = policy?.isActive ? await this.resolveChain(policy, requester, input.metadata) : [];

    const request = await this.requests.save(
      this.requests.create({
        type: input.type,
        entityId: input.entityId,
        requesterId: requester.id,
        title: input.title,
        summary: input.summary ?? null,
        link: input.link ?? null,
        metadata: input.metadata ?? null,
        status: RequestStatus.PENDING,
        currentStep: 0,
        steps: chain.map((s, i) =>
          this.steps.create({
            ...s,
            stepOrder: i,
            status: i === 0 ? StepStatus.PENDING : StepStatus.WAITING,
          }),
        ),
      }),
    );

    if (!chain.length) {
      return this.finalize(request, RequestStatus.APPROVED, null, 'Auto-approved: no approver in chain');
    }
    await this.notifyApprovers(request, request.steps[0]);
    return request;
  }

  private async resolveChain(
    policy: WorkflowPolicy,
    requester: Employee,
    metadata: SubmitRequestInput['metadata'],
  ): Promise<ResolvedStep[]> {
    const chain: ResolvedStep[] = [];
    for (const step of policy.steps) {
      if (step.condition && !evaluateCondition(step.condition, metadata)) continue;

      let approverEmployeeId: string | null = null;
      switch (step.approverType) {
        case ApproverType.MANAGER:
          approverEmployeeId = requester.managerId;
          break;
        case ApproverType.SKIP_LEVEL_MANAGER:
          approverEmployeeId = requester.manager?.managerId ?? null;
          break;
        case ApproverType.DEPARTMENT_HEAD:
          if (requester.departmentId) {
            const dept = await this.departments.findOne({ where: { id: requester.departmentId } });
            approverEmployeeId = dept?.headId ?? null;
          }
          break;
        case ApproverType.ROLE:
          if (!step.role) continue;
          chain.push({
            label: step.label,
            approverType: step.approverType,
            approverEmployeeId: null,
            approverRole: step.role,
          });
          continue;
      }

      // Skip unresolvable steps, self-approval and consecutive duplicates.
      if (!approverEmployeeId || approverEmployeeId === requester.id) continue;
      if (chain.some((c) => c.approverEmployeeId === approverEmployeeId)) continue;
      chain.push({
        label: step.label,
        approverType: step.approverType,
        approverEmployeeId,
        approverRole: null,
      });
    }
    return chain;
  }

  // ── Decisions ────────────────────────────────────────

  async decide(
    requestId: string,
    user: AuthUser,
    decision: StepStatus.APPROVED | StepStatus.REJECTED,
    comment?: string,
  ): Promise<ApprovalRequest> {
    const request = await this.loadRequest(requestId);
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }
    const step = request.steps.find((s) => s.status === StepStatus.PENDING);
    if (!step || !this.canAct(step, request, user)) {
      throw new ForbiddenException('You are not the approver for the current step');
    }

    step.status = decision;
    step.actedById = user.employeeId;
    step.actedAt = new Date();
    step.comment = comment ?? null;
    await this.steps.save(step);

    if (decision === StepStatus.REJECTED) {
      return this.finalize(request, RequestStatus.REJECTED, user.employeeId, comment ?? null);
    }

    const next = request.steps.find((s) => s.stepOrder > step.stepOrder && s.status === StepStatus.WAITING);
    if (!next) {
      return this.finalize(request, RequestStatus.APPROVED, user.employeeId, comment ?? null);
    }

    next.status = StepStatus.PENDING;
    request.currentStep = next.stepOrder;
    await this.steps.save(next);
    await this.requests.update(request.id, { currentStep: next.stepOrder });
    await this.notifyApprovers(request, next);
    await this.notifications.notifyEmployees([request.requesterId], {
      title: `${request.title}: ${step.label} approved`,
      message: `Now awaiting ${next.label.toLowerCase()}.`,
      link: request.link ?? undefined,
    });
    return this.loadRequest(request.id);
  }

  /** Consolidated approvals — act on many inbox items at once. */
  async bulkDecide(
    ids: string[],
    user: AuthUser,
    decision: StepStatus.APPROVED | StepStatus.REJECTED,
    comment?: string,
  ) {
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.decide(id, user, decision, comment);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: (err as Error).message });
      }
    }
    return results;
  }

  /** Withdraw a pending request (called by features when the requester cancels). */
  async cancelForEntity(type: WorkflowType, entityId: string) {
    const request = await this.requests.findOne({
      where: { type, entityId, status: RequestStatus.PENDING },
      relations: { steps: true },
    });
    if (!request) return;
    request.status = RequestStatus.CANCELLED;
    request.completedAt = new Date();
    for (const s of request.steps) {
      if (s.status === StepStatus.PENDING || s.status === StepStatus.WAITING) s.status = StepStatus.SKIPPED;
    }
    await this.requests.save(request);
  }

  private canAct(step: ApprovalStep, request: ApprovalRequest, user: AuthUser) {
    if (isSuperAdmin(user)) return true;
    if (request.requesterId === user.employeeId) return false;
    if (step.approverEmployeeId) return step.approverEmployeeId === user.employeeId;
    return !!step.approverRole && user.roles.includes(step.approverRole);
  }

  private async finalize(
    request: ApprovalRequest,
    status: RequestStatus.APPROVED | RequestStatus.REJECTED,
    decidedBy: string | null,
    comment: string | null,
  ) {
    await this.requests.update(request.id, { status, completedAt: new Date() });
    await this.steps
      .createQueryBuilder()
      .update()
      .set({ status: StepStatus.SKIPPED })
      .where('requestId = :id AND status IN (:...open)', {
        id: request.id,
        open: [StepStatus.WAITING, StepStatus.PENDING],
      })
      .execute();

    const event: WorkflowDecidedEvent = {
      requestId: request.id,
      type: request.type,
      entityId: request.entityId,
      status,
      decidedByEmployeeId: decidedBy,
      comment,
    };
    await this.events.emitAsync(WORKFLOW_DECIDED, event);

    await this.notifications.notifyEmployees([request.requesterId], {
      title: `${request.title} ${status === RequestStatus.APPROVED ? 'approved' : 'rejected'}`,
      message: comment ?? undefined,
      type: status === RequestStatus.APPROVED ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: request.link ?? undefined,
    });
    return this.loadRequest(request.id);
  }

  private async notifyApprovers(request: ApprovalRequest, step: ApprovalStep) {
    const requester =
      request.requester ?? (await this.employees.findOne({ where: { id: request.requesterId } }));
    const payload = {
      title: `Approval needed: ${request.title}`,
      message: `${requester?.fullName ?? 'An employee'} is waiting on your ${step.label.toLowerCase()}.`,
      type: NotificationType.ACTION,
      link: '/inbox',
    };
    if (step.approverEmployeeId) await this.notifications.notifyEmployees([step.approverEmployeeId], payload);
    else if (step.approverRole) await this.notifications.notifyRole(step.approverRole, payload);
  }

  // ── Queries ──────────────────────────────────────────

  async inbox(user: AuthUser, type?: WorkflowType) {
    const qb = this.steps
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.request', 'r')
      .leftJoinAndSelect('r.requester', 'req')
      .leftJoinAndSelect('req.designation', 'reqDesig')
      .leftJoinAndSelect('req.department', 'reqDept')
      // Full chain so approvers can see prior decisions and what comes next.
      .leftJoinAndSelect('r.steps', 'chain')
      .leftJoinAndSelect('chain.approverEmployee', 'chainApprover')
      .leftJoinAndSelect('chain.actedBy', 'chainActor')
      .where('s.status = :pending', { pending: StepStatus.PENDING })
      .andWhere(
        new Brackets((b) => {
          b.where('s.approverEmployeeId = :me', { me: user.employeeId ?? '' });
          if (user.roles.length) b.orWhere('s.approverRole IN (:...roles)', { roles: user.roles });
        }),
      )
      .orderBy('r.createdAt', 'ASC')
      .addOrderBy('chain.stepOrder', 'ASC');
    if (user.employeeId) qb.andWhere('r.requesterId != :me', { me: user.employeeId });
    if (type) qb.andWhere('r.type = :type', { type });

    const steps = await qb.getMany();
    return steps.map(({ request, ...step }) => ({ step, request }));
  }

  async inboxCount(user: AuthUser) {
    return (await this.inbox(user)).length;
  }

  async listRequests(user: AuthUser, query: RequestQueryDto) {
    const qb = this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.requester', 'req')
      .leftJoinAndSelect('r.steps', 's')
      .leftJoinAndSelect('s.approverEmployee', 'ae')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('s.stepOrder', 'ASC')
      .skip(skipOf(query))
      .take(query.limit);

    if (query.scope === 'all') assertPermission(user, Permission.WORKFLOW_MANAGE);
    else qb.andWhere('r.requesterId = :me', { me: user.employeeId ?? '' });
    if (query.type) qb.andWhere('r.type = :type', { type: query.type });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async getRequest(id: string, user: AuthUser) {
    const request = await this.loadRequest(id);
    const involved =
      request.requesterId === user.employeeId ||
      request.steps.some(
        (s) =>
          s.approverEmployeeId === user.employeeId ||
          (s.approverRole && user.roles.includes(s.approverRole)),
      );
    if (!involved) assertPermission(user, Permission.WORKFLOW_MANAGE);
    return request;
  }

  latestForEntity(type: WorkflowType, entityId: string) {
    return this.requests.findOne({
      where: { type, entityId },
      relations: { steps: { approverEmployee: true, actedBy: true } },
      order: { createdAt: 'DESC', steps: { stepOrder: 'ASC' } },
    });
  }

  private async loadRequest(id: string) {
    const request = await this.requests.findOne({
      where: { id },
      relations: { requester: true, steps: { approverEmployee: true, actedBy: true } },
      order: { steps: { stepOrder: 'ASC' } },
    });
    if (!request) throw new NotFoundException('Approval request not found');
    return request;
  }

  // ── Policy administration ────────────────────────────

  listPolicies() {
    return this.policies.find({ order: { type: 'ASC' } });
  }

  async updatePolicy(type: WorkflowType, dto: UpdatePolicyDto) {
    const policy = await this.policies.findOne({ where: { type } });
    if (!policy) throw new NotFoundException('Policy not found');
    if (dto.steps?.some((s) => s.approverType === ApproverType.ROLE && !s.role)) {
      throw new BadRequestException('Role-based steps must specify a role');
    }
    Object.assign(policy, dto);
    return this.policies.save(policy);
  }
}
