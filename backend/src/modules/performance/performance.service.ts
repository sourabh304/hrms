import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { In, IsNull, Repository } from 'typeorm';
import { assertPermission, AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  CreateCycleDto,
  CreateGoalDto,
  GiveFeedbackDto,
  GoalQueryDto,
  ManagerReviewDto,
  ReviewQueryDto,
  SelfReviewDto,
  UpdateCycleDto,
  UpdateGoalDto,
} from './dto/performance.dto.js';
import { Feedback, FeedbackVisibility } from './entities/feedback.entity.js';
import { Goal, GoalCategory, GoalStatus, KeyResult } from './entities/goal.entity.js';
import { PerformanceReview, ReviewStatus } from './entities/performance-review.entity.js';
import { CycleStatus, ReviewCycle } from './entities/review-cycle.entity.js';

export function goalProgress(keyResults: KeyResult[]): number {
  if (!keyResults.length) return 0;
  const sum = keyResults.reduce((s, kr) => s + (kr.target > 0 ? Math.min(kr.current / kr.target, 1) : 0), 0);
  return Math.round((sum / keyResults.length) * 100);
}

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(ReviewCycle) private readonly cycles: Repository<ReviewCycle>,
    @InjectRepository(Goal) private readonly goals: Repository<Goal>,
    @InjectRepository(PerformanceReview) private readonly reviews: Repository<PerformanceReview>,
    @InjectRepository(Feedback) private readonly feedback: Repository<Feedback>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Cycles ───────────────────────────────────────────

  listCycles() {
    return this.cycles.find({ order: { startDate: 'DESC' } });
  }

  createCycle(dto: CreateCycleDto) {
    return this.cycles.save(this.cycles.create({ ...dto, status: CycleStatus.DRAFT }));
  }

  async updateCycle(id: string, dto: UpdateCycleDto) {
    const cycle = await this.cycles.findOne({ where: { id } });
    if (!cycle) throw new NotFoundException('Review cycle not found');
    return this.cycles.save(Object.assign(cycle, dto));
  }

  /** Activate a cycle and create a review for every employee. */
  async launch(id: string) {
    const cycle = await this.cycles.findOne({ where: { id } });
    if (!cycle) throw new NotFoundException('Review cycle not found');
    if (cycle.status !== CycleStatus.DRAFT) throw new BadRequestException('Cycle has already been launched');

    const employees = await this.employees.find({ where: { status: In(EMPLOYED_STATUSES) } });
    const eligible = employees.filter((e) => e.dateOfJoining <= cycle.endDate);
    await this.reviews.save(
      eligible.map((e) =>
        this.reviews.create({
          cycleId: id,
          employeeId: e.id,
          reviewerId: e.managerId,
          status: ReviewStatus.SELF_REVIEW,
          competencies: cycle.competencies.map((name) => ({ name, self: null, manager: null })),
        }),
      ),
      { chunk: 100 },
    );
    await this.cycles.update(id, { status: CycleStatus.ACTIVE });
    await this.notifications.notifyEmployees(
      eligible.map((e) => e.id),
      {
        title: `${cycle.name} performance review is open`,
        message: `Submit your self-review by ${cycle.selfReviewDue}.`,
        type: NotificationType.ACTION,
        link: '/performance?tab=reviews',
      },
    );
    return { ...cycle, status: CycleStatus.ACTIVE, reviewsCreated: eligible.length };
  }

  async cycleStats(id: string) {
    const reviews = await this.reviews.find({ where: { cycleId: id } });
    const distribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: reviews.filter((x) => Math.round(x.finalRating ?? x.managerRating ?? 0) === r).length,
    }));
    return {
      total: reviews.length,
      selfPending: reviews.filter((r) => r.status === ReviewStatus.SELF_REVIEW).length,
      managerPending: reviews.filter((r) => r.status === ReviewStatus.MANAGER_REVIEW).length,
      completed: reviews.filter((r) => r.status === ReviewStatus.COMPLETED).length,
      distribution,
    };
  }

  // ── Goals ────────────────────────────────────────────

  private async canManageFor(user: AuthUser, employeeId: string) {
    if (employeeId === user.employeeId || hasPermission(user, Permission.PERFORMANCE_MANAGE)) return true;
    const e = await this.employees.findOne({ where: { id: employeeId }, select: { id: true, managerId: true } });
    return e?.managerId === user.employeeId;
  }

  async listGoals(user: AuthUser, query: GoalQueryDto) {
    const qb = this.goals
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.employee', 'e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('g.parentGoal', 'parent')
      .orderBy('g.createdAt', 'DESC');
    if (query.scope === 'company') qb.andWhere('g.category = :c', { c: GoalCategory.COMPANY });
    else if (query.scope === 'all') assertPermission(user, Permission.PERFORMANCE_MANAGE);
    else if (query.scope === 'team') qb.andWhere('e.managerId = :me', { me: requireEmployeeId(user) });
    else qb.andWhere('g.employeeId = :me', { me: query.employeeId ?? requireEmployeeId(user) });
    if (query.employeeId && query.scope !== 'me') qb.andWhere('g.employeeId = :emp', { emp: query.employeeId });
    if (query.cycleId) qb.andWhere('g.cycleId = :cycle', { cycle: query.cycleId });
    return qb.getMany();
  }

  async createGoal(user: AuthUser, dto: CreateGoalDto) {
    const isCompany = dto.category === GoalCategory.COMPANY;
    if (isCompany) assertPermission(user, Permission.PERFORMANCE_MANAGE);
    const employeeId = isCompany ? null : (dto.employeeId ?? requireEmployeeId(user));
    if (employeeId && !(await this.canManageFor(user, employeeId))) {
      throw new ForbiddenException('You can only set goals for yourself or your team');
    }
    const keyResults = dto.keyResults.map((kr) => ({ ...kr, id: kr.id ?? randomUUID() }));
    const progress = goalProgress(keyResults);
    const goal = await this.goals.save(
      this.goals.create({
        ...dto,
        employeeId,
        keyResults,
        progress,
        status: progress >= 100 ? GoalStatus.COMPLETED : progress > 0 ? GoalStatus.ON_TRACK : GoalStatus.NOT_STARTED,
        createdById: user.employeeId,
      }),
    );
    if (employeeId && employeeId !== user.employeeId) {
      await this.notifications.notifyEmployees([employeeId], {
        title: `New goal assigned: ${dto.title}`,
        link: '/performance',
      });
    }
    return goal;
  }

  async updateGoal(id: string, user: AuthUser, dto: UpdateGoalDto) {
    const goal = await this.goals.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.employeeId ? !(await this.canManageFor(user, goal.employeeId)) : !hasPermission(user, Permission.PERFORMANCE_MANAGE)) {
      throw new ForbiddenException('You cannot edit this goal');
    }
    Object.assign(goal, dto);
    if (dto.keyResults) {
      goal.keyResults = dto.keyResults.map((kr) => ({ ...kr, id: kr.id ?? randomUUID() }));
      goal.progress = goalProgress(goal.keyResults);
      if (goal.progress >= 100) goal.status = GoalStatus.COMPLETED;
      else if (goal.status === GoalStatus.NOT_STARTED && goal.progress > 0) goal.status = GoalStatus.ON_TRACK;
    }
    return this.goals.save(goal);
  }

  async deleteGoal(id: string, user: AuthUser) {
    const goal = await this.goals.findOne({ where: { id } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.employeeId ? !(await this.canManageFor(user, goal.employeeId)) : !hasPermission(user, Permission.PERFORMANCE_MANAGE)) {
      throw new ForbiddenException('You cannot delete this goal');
    }
    await this.goals.delete(id);
  }

  // ── Reviews ──────────────────────────────────────────

  async listReviews(user: AuthUser, query: ReviewQueryDto) {
    const qb = this.reviews
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.employee', 'e')
      .leftJoinAndSelect('e.designation', 'designation')
      .leftJoinAndSelect('e.department', 'department')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .leftJoinAndSelect('r.cycle', 'cycle')
      .orderBy('cycle.startDate', 'DESC')
      .addOrderBy('e.firstName', 'ASC');
    if (query.scope === 'all') assertPermission(user, Permission.PERFORMANCE_MANAGE);
    else if (query.scope === 'team') qb.andWhere('r.reviewerId = :me', { me: requireEmployeeId(user) });
    else qb.andWhere('r.employeeId = :me', { me: requireEmployeeId(user) });
    if (query.cycleId) qb.andWhere('r.cycleId = :c', { c: query.cycleId });
    return qb.getMany();
  }

  async getReview(id: string, user: AuthUser) {
    const review = await this.reviews.findOne({
      where: { id },
      relations: { employee: { designation: true, department: true }, reviewer: true, cycle: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    const allowed =
      review.employeeId === user.employeeId ||
      review.reviewerId === user.employeeId ||
      hasPermission(user, Permission.PERFORMANCE_MANAGE);
    if (!allowed) throw new ForbiddenException();

    // The employee can't see manager ratings until the review is completed.
    if (review.employeeId === user.employeeId && review.status !== ReviewStatus.COMPLETED) {
      review.managerRating = null;
      review.managerComments = null;
      review.competencies = review.competencies.map((c) => ({ ...c, manager: null }));
    }
    const goals = await this.goals.find({ where: { employeeId: review.employeeId, cycleId: review.cycleId } });
    const openGoals = goals.length ? goals : await this.goals.find({ where: { employeeId: review.employeeId, cycleId: IsNull() } });
    return { ...review, goals: openGoals };
  }

  async submitSelf(id: string, user: AuthUser, dto: SelfReviewDto) {
    const review = await this.reviews.findOne({ where: { id }, relations: { cycle: true } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.employeeId !== user.employeeId) throw new ForbiddenException('This is not your review');
    if (review.status !== ReviewStatus.SELF_REVIEW) throw new BadRequestException('Self-review already submitted');
    if (review.cycle.status !== CycleStatus.ACTIVE) throw new BadRequestException('Review cycle is not active');

    review.selfRating = dto.rating;
    review.selfComments = dto.comments;
    review.competencies = review.competencies.map((c) => ({
      ...c,
      self: dto.competencies.find((x) => x.name === c.name)?.rating ?? c.self,
    }));
    // Reviews without a reviewer (e.g. the CEO) are completed by HR.
    review.status = ReviewStatus.MANAGER_REVIEW;
    review.selfSubmittedAt = new Date();
    await this.reviews.save(review);
    await this.notifications.notifyEmployees([review.reviewerId], {
      title: 'Self-review submitted — your review is due',
      type: NotificationType.ACTION,
      link: '/performance?tab=team-reviews',
    });
    return this.getReview(id, user);
  }

  async submitManager(id: string, user: AuthUser, dto: ManagerReviewDto) {
    const review = await this.reviews.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    const isReviewer = review.reviewerId === user.employeeId;
    if (!isReviewer && !hasPermission(user, Permission.PERFORMANCE_MANAGE)) {
      throw new ForbiddenException('You are not the reviewer');
    }
    if (review.status !== ReviewStatus.MANAGER_REVIEW) {
      throw new BadRequestException('Waiting for the employee’s self-review');
    }
    Object.assign(review, {
      managerRating: dto.rating,
      managerComments: dto.comments,
      strengths: dto.strengths ?? null,
      improvements: dto.improvements ?? null,
      finalRating: dto.rating,
      status: ReviewStatus.COMPLETED,
      managerSubmittedAt: new Date(),
      competencies: review.competencies.map((c) => ({
        ...c,
        manager: dto.competencies.find((x) => x.name === c.name)?.rating ?? c.manager,
      })),
    });
    await this.reviews.save(review);
    await this.notifications.notifyEmployees([review.employeeId], {
      title: 'Your performance review has been completed',
      type: NotificationType.SUCCESS,
      link: '/performance?tab=reviews',
    });
    return this.getReview(id, user);
  }

  async calibrate(id: string, finalRating: number) {
    await this.reviews.update(id, { finalRating });
    return this.reviews.findOne({ where: { id } });
  }

  // ── Feedback ─────────────────────────────────────────

  async giveFeedback(user: AuthUser, dto: GiveFeedbackDto) {
    const fromId = requireEmployeeId(user);
    if (dto.toId === fromId) throw new BadRequestException('You cannot give feedback to yourself');
    const fb = await this.feedback.save(this.feedback.create({ ...dto, fromId }));
    await this.notifications.notifyEmployees([dto.toId], {
      title: 'You received new feedback',
      link: '/performance?tab=feedback',
    });
    return fb;
  }

  async listFeedback(user: AuthUser, direction: 'received' | 'given' | 'team') {
    const me = requireEmployeeId(user);
    const qb = this.feedback
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.from', 'from')
      .leftJoinAndSelect('f.to', 'to')
      .leftJoinAndSelect('to.designation', 'toDesig')
      .leftJoinAndSelect('from.designation', 'fromDesig')
      .orderBy('f.createdAt', 'DESC')
      .take(100);
    if (direction === 'received') qb.where('f.toId = :me', { me });
    else if (direction === 'given') qb.where('f.fromId = :me', { me });
    else {
      qb.where('to.managerId = :me', { me }).andWhere('f.visibility = :v', {
        v: FeedbackVisibility.SHARED_WITH_MANAGER,
      });
    }
    return qb.getMany();
  }
}
