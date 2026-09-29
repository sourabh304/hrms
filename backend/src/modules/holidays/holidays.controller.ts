import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { Permission } from '../../common/auth/roles.js';
import { RequirePermissions } from '../../common/decorators/index.js';
import { todayISO } from '../../common/utils/dates.js';
import { Holiday } from './entities/holiday.entity.js';
import { CreateHolidayDto, HolidayQueryDto, UpdateHolidayDto } from './holidays.dto.js';

@ApiTags('Holidays')
@Controller('holidays')
export class HolidaysController {
  constructor(@InjectRepository(Holiday) private readonly repo: Repository<Holiday>) {}

  @Get()
  async list(@Query() query: HolidayQueryDto) {
    const year = query.year ?? new Date().getFullYear();
    const rows = await this.repo.find({
      where: { date: Between(`${year}-01-01`, `${year}-12-31`) },
      relations: { location: true },
      order: { date: 'ASC' },
    });
    return rows.filter((h) => !query.locationId || !h.locationId || h.locationId === query.locationId);
  }

  @Get('upcoming')
  upcoming(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.repo.find({
      where: { date: MoreThanOrEqual(todayISO()) },
      relations: { location: true },
      order: { date: 'ASC' },
      take: limit ?? 5,
    });
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.repo.save(this.repo.create(dto));
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHolidayDto) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Holiday not found');
    return this.repo.save(Object.assign(row, dto));
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.repo.delete(id);
  }
}
