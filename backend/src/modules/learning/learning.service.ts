import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { paginated, skipOf } from '../../common/dto/pagination.dto.js';
import { todayISO } from '../../common/utils/dates.js';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AssignCourseDto, CourseQueryDto, CreateCourseDto, UpdateCourseDto } from './dto/learning.dto.js';
import { Course, CourseStatus } from './entities/course.entity.js';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity.js';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Enrollment) private readonly enrollments: Repository<Enrollment>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly notifications: NotificationsService,
  ) {}

  async catalog(user: AuthUser, query: CourseQueryDto) {
    const qb = this.courses
      .createQueryBuilder('c')
      .orderBy('c.isMandatory', 'DESC')
      .addOrderBy('c.title', 'ASC')
      .skip(skipOf(query))
      .take(query.limit);
    if (!hasPermission(user, Permission.LEARNING_MANAGE)) qb.andWhere('c.status = :p', { p: CourseStatus.PUBLISHED });
    if (query.category) qb.andWhere('c.category = :cat', { cat: query.category });
    if (query.level) qb.andWhere('c.level = :lvl', { lvl: query.level });
    if (query.search) {
      qb.andWhere('(LOWER(c.title) LIKE :s OR LOWER(c.description) LIKE :s)', { s: `%${query.search.toLowerCase()}%` });
    }
    const [rows, total] = await qb.getManyAndCount();

    const ids = rows.map((r) => r.id);
    const [counts, mine] = await Promise.all([
      ids.length
        ? this.enrollments
            .createQueryBuilder('e')
            .select('e.courseId', 'courseId')
            .addSelect('COUNT(*)', 'enrolled')
            .addSelect(`SUM(CASE WHEN e.status = '${EnrollmentStatus.COMPLETED}' THEN 1 ELSE 0 END)`, 'completed')
            .where('e.courseId IN (:...ids)', { ids })
            .groupBy('e.courseId')
            .getRawMany<{ courseId: string; enrolled: string; completed: string }>()
        : [],
      user.employeeId && ids.length
        ? this.enrollments.find({ where: { employeeId: user.employeeId, courseId: In(ids) } })
        : [],
    ]);
    const data = rows.map((c) => {
      const stat = counts.find((x) => x.courseId === c.id);
      return {
        ...c,
        enrolledCount: Number(stat?.enrolled ?? 0),
        completedCount: Number(stat?.completed ?? 0),
        myEnrollment: mine.find((m) => m.courseId === c.id) ?? null,
      };
    });
    return paginated(data, total, query);
  }

  async categories() {
    const rows = await this.courses
      .createQueryBuilder('c')
      .select('DISTINCT c.category', 'category')
      .orderBy('category')
      .getRawMany<{ category: string }>();
    return rows.map((r) => r.category);
  }

  async getCourse(id: string) {
    const course = await this.courses.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  createCourse(dto: CreateCourseDto) {
    return this.courses.save(this.courses.create(dto));
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const course = await this.getCourse(id);
    return this.courses.save(Object.assign(course, dto));
  }

  async enroll(user: AuthUser, courseId: string) {
    const employeeId = requireEmployeeId(user);
    const course = await this.getCourse(courseId);
    if (course.status !== CourseStatus.PUBLISHED) throw new BadRequestException('Course is not available');
    const existing = await this.enrollments.findOne({ where: { courseId, employeeId } });
    if (existing && existing.status !== EnrollmentStatus.DROPPED) return existing;
    return this.enrollments.save(
      this.enrollments.create({ ...(existing ?? {}), courseId, employeeId, status: EnrollmentStatus.ENROLLED, progress: 0 }),
    );
  }

  /** HR assigns to anyone; managers to their direct reports. */
  async assign(user: AuthUser, dto: AssignCourseDto) {
    const course = await this.getCourse(dto.courseId);
    let ids = dto.employeeIds ?? [];
    if (dto.departmentId) {
      const inDept = await this.employees.find({
        where: { departmentId: dto.departmentId, status: In(EMPLOYED_STATUSES) },
        select: { id: true },
      });
      ids = [...new Set([...ids, ...inDept.map((e) => e.id)])];
    }
    if (!ids.length) throw new BadRequestException('Select at least one employee or a department');

    if (!hasPermission(user, Permission.LEARNING_MANAGE)) {
      const reports = await this.employees.find({ where: { id: In(ids) }, select: { id: true, managerId: true } });
      if (reports.some((r) => r.managerId !== user.employeeId)) {
        throw new ForbiddenException('You can only assign training to your direct reports');
      }
    }
    const existing = await this.enrollments.find({ where: { courseId: course.id, employeeId: In(ids) } });
    const fresh = ids.filter((id) => !existing.some((e) => e.employeeId === id));
    await this.enrollments.save(
      fresh.map((employeeId) =>
        this.enrollments.create({
          courseId: course.id,
          employeeId,
          dueDate: dto.dueDate ?? null,
          assignedById: user.employeeId,
          status: EnrollmentStatus.ENROLLED,
        }),
      ),
    );
    await this.notifications.notifyEmployees(fresh, {
      title: `Training assigned: ${course.title}`,
      message: dto.dueDate ? `Please complete by ${dto.dueDate}.` : undefined,
      type: NotificationType.ACTION,
      link: '/learning',
    });
    return { assigned: fresh.length, alreadyEnrolled: existing.length };
  }

  myEnrollments(user: AuthUser) {
    return this.enrollments.find({
      where: { employeeId: requireEmployeeId(user) },
      relations: { course: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async updateProgress(id: string, user: AuthUser, progress: number) {
    const enrollment = await this.enrollments.findOne({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.employeeId !== user.employeeId) throw new ForbiddenException();
    enrollment.progress = progress;
    enrollment.status =
      progress >= 100 ? EnrollmentStatus.COMPLETED : progress > 0 ? EnrollmentStatus.IN_PROGRESS : EnrollmentStatus.ENROLLED;
    enrollment.completedAt = progress >= 100 ? new Date() : null;
    return this.enrollments.save(enrollment);
  }

  async courseEnrollments(courseId: string) {
    return this.enrollments.find({
      where: { courseId },
      relations: { employee: { designation: true, department: true } },
      order: { status: 'ASC' },
    });
  }

  async stats() {
    const all = await this.enrollments.find({ relations: { course: true } });
    const today = todayISO();
    const mandatory = all.filter((e) => e.course.isMandatory);
    return {
      totalEnrollments: all.length,
      completed: all.filter((e) => e.status === EnrollmentStatus.COMPLETED).length,
      inProgress: all.filter((e) => e.status === EnrollmentStatus.IN_PROGRESS).length,
      overdue: all.filter((e) => e.dueDate && e.dueDate < today && e.status !== EnrollmentStatus.COMPLETED).length,
      mandatoryCompliance: mandatory.length
        ? Math.round((mandatory.filter((e) => e.status === EnrollmentStatus.COMPLETED).length / mandatory.length) * 100)
        : 100,
    };
  }
}
