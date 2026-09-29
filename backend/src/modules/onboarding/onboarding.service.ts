import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuthUser, hasPermission, isSuperAdmin } from '../../common/auth/auth-user.js';
import { Permission, Role } from '../../common/auth/roles.js';
import { addDays, todayISO } from '../../common/utils/dates.js';
import { EMPLOYEE_CREATED } from '../employees/employees.events.js';
import type { EmployeeCreatedEvent } from '../employees/employees.events.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  CreateTemplateDto,
  JourneyQueryDto,
  StartJourneyDto,
  UpdateTemplateDto,
} from './dto/onboarding.dto.js';
import { JourneyTemplate, JourneyType, TaskAssignee } from './entities/journey-template.entity.js';
import { Journey, JourneyStatus } from './entities/journey.entity.js';
import { JourneyTask, TaskStatus } from './entities/journey-task.entity.js';

const ROLE_FOR: Partial<Record<TaskAssignee, Role>> = {
  HR: Role.HR_ADMIN,
  IT: Role.IT_ADMIN,
  FINANCE: Role.FINANCE,
};

/** Onboarding & offboarding journeys: templated, auto-assigned task checklists. */
@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(JourneyTemplate) private readonly templates: Repository<JourneyTemplate>,
    @InjectRepository(Journey) private readonly journeys: Repository<Journey>,
    @InjectRepository(JourneyTask) private readonly tasks: Repository<JourneyTask>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Templates ────────────────────────────────────────

  listTemplates(type?: JourneyType) {
    return this.templates.find({ where: type ? { type } : {}, order: { type: 'ASC', name: 'ASC' } });
  }

  async createTemplate(dto: CreateTemplateDto) {
    if (dto.isDefault) await this.templates.update({ type: dto.type, isDefault: true }, { isDefault: false });
    return this.templates.save(this.templates.create(dto));
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    if (dto.isDefault) await this.templates.update({ type: dto.type ?? t.type, isDefault: true }, { isDefault: false });
    return this.templates.save(Object.assign(t, dto));
  }

  async deleteTemplate(id: string) {
    await this.templates.delete(id);
  }

  // ── Journeys ─────────────────────────────────────────

  async start(dto: StartJourneyDto & { separationId?: string }) {
    const employee = await this.employees.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const template = dto.templateId
      ? await this.templates.findOne({ where: { id: dto.templateId } })
      : await this.templates.findOne({ where: { type: dto.type, isDefault: true } });
    if (!template) throw new NotFoundException(`No ${dto.type.toLowerCase()} template configured`);

    const startDate = dto.startDate ?? (dto.type === JourneyType.ONBOARDING ? employee.dateOfJoining : todayISO());
    const journey = await this.journeys.save(
      this.journeys.create({
        employeeId: employee.id,
        type: template.type,
        templateName: template.name,
        startDate,
        separationId: dto.separationId ?? null,
        status: JourneyStatus.IN_PROGRESS,
        tasks: template.tasks.map((t, i) =>
          this.tasks.create({
            title: t.title,
            description: t.description ?? null,
            category: t.category,
            assigneeType: t.assignee,
            assigneeEmployeeId:
              t.assignee === 'EMPLOYEE' ? employee.id : t.assignee === 'MANAGER' ? employee.managerId : null,
            assigneeRole: ROLE_FOR[t.assignee] ?? null,
            dueDate: addDays(startDate, t.dueOffsetDays),
            sortOrder: i,
          }),
        ),
      }),
    );

    const label = template.type === JourneyType.ONBOARDING ? 'Onboarding' : 'Offboarding';
    await this.notifications.notifyEmployees(
      [employee.managerId, template.type === JourneyType.ONBOARDING ? employee.id : null],
      { title: `${label} started for ${employee.fullName}`, link: '/onboarding', type: NotificationType.INFO },
    );
    return this.get(journey.id);
  }

  @OnEvent(EMPLOYEE_CREATED)
  async onEmployeeCreated(event: EmployeeCreatedEvent) {
    const hasDefault = await this.templates.exists({ where: { type: JourneyType.ONBOARDING, isDefault: true } });
    if (hasDefault) await this.start({ employeeId: event.employeeId, type: JourneyType.ONBOARDING });
  }

  private withProgress(j: Journey) {
    const total = j.tasks?.length ?? 0;
    const done = j.tasks?.filter((t) => t.status !== TaskStatus.PENDING).length ?? 0;
    return { ...j, progress: total ? Math.round((done / total) * 100) : 0, totalTasks: total, completedTasks: done };
  }

  async list(user: AuthUser, query: JourneyQueryDto) {
    const qb = this.journeys
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.employee', 'e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.department', 'department')
      .leftJoinAndSelect('j.tasks', 't')
      .orderBy('j.startDate', 'DESC');
    const canManage =
      hasPermission(user, Permission.ONBOARDING_MANAGE) || hasPermission(user, Permission.OFFBOARDING_MANAGE);
    if (!canManage) {
      qb.andWhere('(e.managerId = :me OR e.id = :me)', { me: user.employeeId ?? '' });
    }
    if (query.type) qb.andWhere('j.type = :type', { type: query.type });
    if (query.status) qb.andWhere('j.status = :status', { status: query.status });
    return (await qb.getMany()).map((j) => this.withProgress(j));
  }

  async get(id: string) {
    const journey = await this.journeys.findOne({
      where: { id },
      relations: { employee: { designation: true, department: true, manager: true }, tasks: { assigneeEmployee: true } },
      order: { tasks: { sortOrder: 'ASC' } },
    });
    if (!journey) throw new NotFoundException('Journey not found');
    return this.withProgress(journey);
  }

  async myTasks(user: AuthUser) {
    const qb = this.tasks
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.journey', 'j')
      .leftJoinAndSelect('j.employee', 'e')
      .where('t.status = :pending', { pending: TaskStatus.PENDING })
      .andWhere('j.status = :active', { active: JourneyStatus.IN_PROGRESS })
      .andWhere(
        new Brackets((b) => {
          b.where('t.assigneeEmployeeId = :me', { me: user.employeeId ?? '' });
          if (user.roles.length) b.orWhere('t.assigneeRole IN (:...roles)', { roles: user.roles });
        }),
      )
      .orderBy('t.dueDate', 'ASC');
    return qb.getMany();
  }

  async updateTask(id: string, status: TaskStatus, user: AuthUser) {
    const task = await this.tasks.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    const allowed =
      isSuperAdmin(user) ||
      hasPermission(user, Permission.ONBOARDING_MANAGE) ||
      task.assigneeEmployeeId === user.employeeId ||
      (task.assigneeRole && user.roles.includes(task.assigneeRole));
    if (!allowed) throw new ForbiddenException('This task is not assigned to you');

    await this.tasks.update(id, {
      status,
      completedAt: status === TaskStatus.PENDING ? null : new Date(),
      completedById: status === TaskStatus.PENDING ? null : user.employeeId,
    });
    const remaining = await this.tasks.count({ where: { journeyId: task.journeyId, status: TaskStatus.PENDING } });
    await this.journeys.update(task.journeyId, {
      status: remaining ? JourneyStatus.IN_PROGRESS : JourneyStatus.COMPLETED,
      completedAt: remaining ? null : new Date(),
    });
    return this.get(task.journeyId);
  }

  async cancelForSeparation(separationId: string) {
    await this.journeys.update({ separationId, status: JourneyStatus.IN_PROGRESS }, { status: JourneyStatus.CANCELLED });
  }
}
