import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { AuthUser, hasPermission, requireEmployeeId } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { EMPLOYED_STATUSES, Employee } from '../employees/entities/employee.entity.js';
import { NotificationType } from '../notifications/entities/notification.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateSurveyDto, GiveKudosDto } from './dto/engagement.dto.js';
import { Kudos } from './entities/kudos.entity.js';
import { Survey, SurveyResponse, SurveyStatus } from './entities/survey.entity.js';

const respondentKey = (surveyId: string, employeeId: string) =>
  createHash('sha256').update(`${surveyId}:${employeeId}`).digest('hex');

/** eNPS = % promoters (9–10) − % detractors (0–6). */
export function enps(scores: number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

@Injectable()
export class EngagementService {
  constructor(
    @InjectRepository(Kudos) private readonly kudos: Repository<Kudos>,
    @InjectRepository(Survey) private readonly surveys: Repository<Survey>,
    @InjectRepository(SurveyResponse) private readonly responses: Repository<SurveyResponse>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Kudos ────────────────────────────────────────────

  kudosFeed(limit = 30) {
    return this.kudos.find({
      relations: { from: { designation: true }, to: { designation: true } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async giveKudos(user: AuthUser, dto: GiveKudosDto) {
    const fromId = requireEmployeeId(user);
    if (dto.toId === fromId) throw new BadRequestException('You cannot give kudos to yourself');
    const saved = await this.kudos.save(this.kudos.create({ ...dto, fromId, likes: [] }));
    const from = await this.employees.findOne({ where: { id: fromId } });
    await this.notifications.notifyEmployees([dto.toId], {
      title: `${from?.fullName ?? 'A colleague'} gave you kudos 🎉`,
      message: dto.message.slice(0, 140),
      type: NotificationType.SUCCESS,
      link: '/engagement',
    });
    return saved;
  }

  async toggleLike(id: string, user: AuthUser) {
    const me = requireEmployeeId(user);
    const k = await this.kudos.findOne({ where: { id } });
    if (!k) throw new NotFoundException('Kudos not found');
    k.likes = k.likes.includes(me) ? k.likes.filter((x) => x !== me) : [...k.likes, me];
    return this.kudos.save(k);
  }

  async leaderboard(days = 90) {
    const since = new Date(Date.now() - days * 864e5);
    const rows = await this.kudos
      .createQueryBuilder('k')
      .select('k.toId', 'employeeId')
      .addSelect('COUNT(*)', 'count')
      .where('k.createdAt >= :since', { since })
      .groupBy('k.toId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ employeeId: string; count: string }>();
    const people = rows.length
      ? await this.employees.find({ where: { id: In(rows.map((r) => r.employeeId)) }, relations: { designation: true } })
      : [];
    return rows.map((r) => {
      const e = people.find((p) => p.id === r.employeeId);
      return {
        count: Number(r.count),
        employee: e ? { id: e.id, fullName: e.fullName, avatarUrl: e.avatarUrl, designation: e.designation?.title ?? null } : null,
      };
    });
  }

  // ── Surveys ──────────────────────────────────────────

  async listSurveys(user: AuthUser) {
    const manage = hasPermission(user, Permission.ENGAGEMENT_MANAGE);
    const surveys = await this.surveys.find({
      where: manage ? {} : { status: SurveyStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    const me = user.employeeId;
    const answered = me
      ? await this.responses.find({
          where: { respondentKey: In(surveys.map((s) => respondentKey(s.id, me))) },
          select: { surveyId: true },
        })
      : [];
    const counts = surveys.length
      ? await this.responses
          .createQueryBuilder('r')
          .select('r.surveyId', 'surveyId')
          .addSelect('COUNT(*)', 'count')
          .where('r.surveyId IN (:...ids)', { ids: surveys.map((s) => s.id) })
          .groupBy('r.surveyId')
          .getRawMany<{ surveyId: string; count: string }>()
      : [];
    return surveys.map((s) => ({
      ...s,
      hasResponded: answered.some((a) => a.surveyId === s.id),
      responseCount: Number(counts.find((c) => c.surveyId === s.id)?.count ?? 0),
    }));
  }

  async getSurvey(id: string) {
    const survey = await this.surveys.findOne({ where: { id } });
    if (!survey) throw new NotFoundException('Survey not found');
    return survey;
  }

  createSurvey(user: AuthUser, dto: CreateSurveyDto) {
    return this.surveys.save(
      this.surveys.create({
        ...dto,
        questions: dto.questions.map((q) => ({ ...q, id: q.id ?? randomUUID() })),
        createdById: user.employeeId,
        status: SurveyStatus.DRAFT,
      }),
    );
  }

  async setStatus(id: string, status: SurveyStatus) {
    const survey = await this.getSurvey(id);
    survey.status = status;
    await this.surveys.save(survey);
    if (status === SurveyStatus.ACTIVE) {
      const all = await this.employees.find({ where: { status: In(EMPLOYED_STATUSES) }, select: { id: true } });
      await this.notifications.notifyEmployees(all.map((e) => e.id), {
        title: `New pulse survey: ${survey.title}`,
        message: survey.isAnonymous ? 'Your responses are anonymous.' : undefined,
        type: NotificationType.ACTION,
        link: '/engagement?tab=surveys',
      });
    }
    return survey;
  }

  async respond(id: string, user: AuthUser, answers: Record<string, string | number>) {
    const employeeId = requireEmployeeId(user);
    const survey = await this.getSurvey(id);
    if (survey.status !== SurveyStatus.ACTIVE) throw new BadRequestException('This survey is not open');
    for (const q of survey.questions.filter((q) => q.required)) {
      if (answers[q.id] === undefined || answers[q.id] === '') throw new BadRequestException(`"${q.text}" is required`);
    }
    const key = respondentKey(id, employeeId);
    if (await this.responses.exists({ where: { surveyId: id, respondentKey: key } })) {
      throw new ConflictException('You have already responded to this survey');
    }
    const employee = await this.employees.findOne({ where: { id: employeeId } });
    await this.responses.save(
      this.responses.create({
        surveyId: id,
        respondentKey: key,
        employeeId: survey.isAnonymous ? null : employeeId,
        departmentId: employee?.departmentId ?? null,
        answers,
      }),
    );
    return { ok: true };
  }

  async results(id: string) {
    const survey = await this.getSurvey(id);
    const [responses, headcount] = await Promise.all([
      this.responses.find({ where: { surveyId: id }, relations: { department: true } }),
      this.employees.count({ where: { status: In(EMPLOYED_STATUSES) } }),
    ]);
    const questions = survey.questions.map((q) => {
      const values = responses.map((r) => r.answers[q.id]).filter((v) => v !== undefined && v !== '');
      if (q.type === 'TEXT') return { ...q, responses: values.length, comments: values.map(String).slice(0, 100) };
      if (q.type === 'CHOICE') {
        return {
          ...q,
          responses: values.length,
          distribution: (q.options ?? []).map((o) => ({ option: o, count: values.filter((v) => v === o).length })),
        };
      }
      const nums = values.map(Number).filter((n) => !Number.isNaN(n));
      const range = q.type === 'ENPS' ? [...Array(11).keys()] : [1, 2, 3, 4, 5];
      return {
        ...q,
        responses: nums.length,
        average: nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : null,
        enps: q.type === 'ENPS' ? enps(nums) : undefined,
        distribution: range.map((v) => ({ option: String(v), count: nums.filter((n) => n === v).length })),
      };
    });
    const byDepartment = new Map<string, number>();
    for (const r of responses) byDepartment.set(r.department?.name ?? 'Unassigned', (byDepartment.get(r.department?.name ?? 'Unassigned') ?? 0) + 1);
    return {
      survey,
      totalResponses: responses.length,
      responseRate: headcount ? Math.round((responses.length / headcount) * 100) : 0,
      questions,
      byDepartment: [...byDepartment.entries()].map(([department, count]) => ({ department, count })),
    };
  }
}
