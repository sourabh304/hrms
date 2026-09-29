import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { todayISO } from '../../common/utils/dates.js';
import { applyScope } from '../../common/utils/scope.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrganizationService } from '../organization/organization.service.js';
import { WorkflowService } from '../workflow/workflow.service.js';
import { RequestStatus, WORKFLOW_DECIDED, WorkflowType } from '../workflow/workflow.types.js';
import type { WorkflowDecidedEvent } from '../workflow/workflow.types.js';
import { CreateExpenseDto, ExpenseQueryDto, ReimburseDto, UpdateExpenseDto } from './dto/expense.dto.js';
import { ExpenseClaim, ExpenseStatus } from './entities/expense-claim.entity.js';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ExpenseClaim) private readonly repo: Repository<ExpenseClaim>,
    private readonly workflow: WorkflowService,
    private readonly org: OrganizationService,
    private readonly notifications: NotificationsService,
  ) {}

  private async nextNumber() {
    const rows = await this.repo.createQueryBuilder('c').select('c.claimNumber', 'n').getRawMany<{ n: string }>();
    const max = rows.reduce((m, r) => Math.max(m, Number(r.n.split('-').pop()) || 0), 0);
    return `EXP-${String(max + 1).padStart(5, '0')}`;
  }

  async create(user: AuthUser, dto: CreateExpenseDto) {
    const employeeId = requireEmployeeId(user);
    if (dto.expenseDate > todayISO()) throw new BadRequestException('Expense date cannot be in the future');
    const { submit, ...data } = dto;
    const { currency } = await this.org.getSettings();
    const claim = await this.repo.save(
      this.repo.create({
        ...data,
        currency: data.currency ?? currency,
        employeeId,
        claimNumber: await this.nextNumber(),
        status: ExpenseStatus.DRAFT,
      }),
    );
    if (submit !== false) return this.submit(claim.id, user);
    return this.get(claim.id, user);
  }

  async update(id: string, user: AuthUser, dto: UpdateExpenseDto) {
    const claim = await this.repo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.employeeId !== user.employeeId) throw new ForbiddenException();
    if (claim.status !== ExpenseStatus.DRAFT) throw new BadRequestException('Only drafts can be edited');
    const { submit, ...data } = dto;
    await this.repo.save(Object.assign(claim, data));
    if (submit) return this.submit(id, user);
    return this.get(id, user);
  }

  async submit(id: string, user: AuthUser) {
    const claim = await this.repo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.employeeId !== user.employeeId) throw new ForbiddenException();
    if (claim.status !== ExpenseStatus.DRAFT) throw new BadRequestException('Claim has already been submitted');

    await this.repo.update(id, { status: ExpenseStatus.SUBMITTED, submittedAt: new Date() });
    const approval = await this.workflow.submit({
      type: WorkflowType.EXPENSE,
      entityId: id,
      requesterId: claim.employeeId,
      title: `${claim.claimNumber} · ${claim.title}`,
      summary: claim.description ?? undefined,
      link: '/expenses',
      metadata: {
        amount: claim.amount,
        currency: claim.currency,
        category: claim.category,
        expenseDate: claim.expenseDate,
        merchant: claim.merchant,
        receiptFileId: claim.receiptFileId,
      },
    });
    await this.repo.update(id, { approvalRequestId: approval.id });
    return this.get(id, user);
  }

  @OnEvent(WORKFLOW_DECIDED)
  async onDecision(event: WorkflowDecidedEvent) {
    if (event.type !== WorkflowType.EXPENSE) return;
    const claim = await this.repo.findOne({ where: { id: event.entityId } });
    if (!claim || claim.status !== ExpenseStatus.SUBMITTED) return;
    await this.repo.update(claim.id, {
      status: event.status === RequestStatus.APPROVED ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED,
      decisionNote: event.comment,
    });
  }

  async cancel(id: string, user: AuthUser) {
    const claim = await this.repo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.employeeId !== user.employeeId) throw new ForbiddenException();
    if (![ExpenseStatus.DRAFT, ExpenseStatus.SUBMITTED].includes(claim.status)) {
      throw new BadRequestException('This claim can no longer be cancelled');
    }
    if (claim.status === ExpenseStatus.SUBMITTED) await this.workflow.cancelForEntity(WorkflowType.EXPENSE, id);
    await this.repo.update(id, { status: ExpenseStatus.CANCELLED });
    return this.get(id, user);
  }

  async reimburse(id: string, dto: ReimburseDto) {
    const claim = await this.repo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ExpenseStatus.APPROVED) throw new BadRequestException('Only approved claims can be reimbursed');
    await this.repo.update(id, {
      status: ExpenseStatus.REIMBURSED,
      reimbursedAt: new Date(),
      paymentReference: dto.paymentReference ?? null,
    });
    await this.notifications.notifyEmployees([claim.employeeId], {
      title: `${claim.claimNumber} reimbursed`,
      message: `${claim.currency} ${claim.amount.toFixed(2)} has been paid out.`,
      type: NotificationType.SUCCESS,
      link: '/expenses',
    });
    return this.repo.findOne({ where: { id }, relations: { employee: true } });
  }

  async get(id: string, user: AuthUser) {
    const claim = await this.repo.findOne({ where: { id }, relations: { employee: { designation: true } } });
    if (!claim) throw new NotFoundException('Claim not found');
    const allowed =
      claim.employeeId === user.employeeId ||
      claim.employee.managerId === user.employeeId ||
      hasPermission(user, Permission.EXPENSE_MANAGE);
    if (!allowed) throw new ForbiddenException();
    return claim;
  }

  async list(user: AuthUser, query: ExpenseQueryDto) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.employee', 'e')
      .leftJoinAndSelect('e.department', 'department')
      .orderBy('c.createdAt', 'DESC')
      .skip(skipOf(query))
      .take(query.limit);
    applyScope(qb, { scope: query.scope, user, employeeAlias: 'e', permission: Permission.EXPENSE_MANAGE });
    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.category) qb.andWhere('c.category = :cat', { cat: query.category });
    if (query.search) {
      qb.andWhere('(LOWER(c.title) LIKE :s OR LOWER(c.claimNumber) LIKE :s OR LOWER(e.firstName) LIKE :s)', {
        s: `%${query.search.toLowerCase()}%`,
      });
    }
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, query);
  }

  async summary(user: AuthUser, scope: 'me' | 'all') {
    const qb = this.repo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('c.category', 'category')
      .addSelect('SUM(c.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .addGroupBy('c.category');
    if (scope === 'all') assertPermission(user, Permission.EXPENSE_MANAGE);
    else qb.where('c.employeeId = :me', { me: requireEmployeeId(user) });
    const rows = await qb.getRawMany<{ status: string; category: string; total: string; count: string }>();
    const sum = (pred: (r: (typeof rows)[number]) => boolean) =>
      Math.round(rows.filter(pred).reduce((s, r) => s + Number(r.total), 0) * 100) / 100;
    const byCategory = new Map<string, number>();
    for (const r of rows.filter((r) => r.status !== ExpenseStatus.CANCELLED && r.status !== ExpenseStatus.REJECTED)) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + Number(r.total));
    }
    return {
      pending: sum((r) => r.status === ExpenseStatus.SUBMITTED),
      approved: sum((r) => r.status === ExpenseStatus.APPROVED),
      reimbursed: sum((r) => r.status === ExpenseStatus.REIMBURSED),
      rejected: sum((r) => r.status === ExpenseStatus.REJECTED),
      byCategory: [...byCategory.entries()].map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 })),
    };
  }
}
