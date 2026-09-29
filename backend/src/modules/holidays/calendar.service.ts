import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { eachDay, Weekday, weekdayOf } from '../../common/utils/dates.js';
import { CompanySettings } from '../organization/entities/company-settings.entity.js';
import { Holiday, HolidayType } from './entities/holiday.entity.js';

export type DayKind = 'WORKING' | 'WEEKEND' | 'HOLIDAY';

export interface DayInfo {
  date: string;
  kind: DayKind;
  holiday?: string;
}

/** Single source of truth for working vs non-working days. */
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Holiday) private readonly holidays: Repository<Holiday>,
    @InjectRepository(CompanySettings) private readonly settings: Repository<CompanySettings>,
  ) {}

  async weeklyOffs(): Promise<Weekday[]> {
    const [s] = await this.settings.find({ take: 1 });
    return s?.weeklyOffs?.length ? s.weeklyOffs : ['SAT', 'SUN'];
  }

  async holidaysBetween(start: string, end: string, locationId?: string | null) {
    const rows = await this.holidays.find({ where: { date: Between(start, end) }, order: { date: 'ASC' } });
    return rows.filter((h) => !h.locationId || !locationId || h.locationId === locationId);
  }

  async classify(start: string, end: string, locationId?: string | null): Promise<DayInfo[]> {
    const [offs, holidays] = await Promise.all([
      this.weeklyOffs(),
      this.holidaysBetween(start, end, locationId),
    ]);
    const closed = new Map(
      holidays.filter((h) => h.type !== HolidayType.OPTIONAL).map((h) => [h.date, h.name]),
    );
    return eachDay(start, end).map((date) => {
      if (closed.has(date)) return { date, kind: 'HOLIDAY' as const, holiday: closed.get(date) };
      if (offs.includes(weekdayOf(date))) return { date, kind: 'WEEKEND' as const };
      return { date, kind: 'WORKING' as const };
    });
  }

  async workingDays(start: string, end: string, locationId?: string | null): Promise<string[]> {
    return (await this.classify(start, end, locationId)).filter((d) => d.kind === 'WORKING').map((d) => d.date);
  }

  async countWorkingDays(start: string, end: string, locationId?: string | null) {
    return (await this.workingDays(start, end, locationId)).length;
  }
}
