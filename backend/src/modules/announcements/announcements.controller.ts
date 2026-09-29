import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, PartialType } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Brackets, Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { hasPermission } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { todayISO } from '../../common/utils/dates.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Announcement, AnnouncementCategory } from './entities/announcement.entity.js';

export class CreateAnnouncementDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @MinLength(10) content: string;
  @IsOptional() @IsEnum(AnnouncementCategory) category?: AnnouncementCategory;
  @IsOptional() @IsBoolean() isPinned?: boolean;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() expiresOn?: string;
  @IsOptional() @IsUUID() departmentId?: string | null;
}

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    @InjectRepository(Announcement) private readonly repo: Repository<Announcement>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  /** Feed for the current user: live, company-wide or their department, pinned first. */
  @Get()
  async feed(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.author', 'author')
      .leftJoinAndSelect('author.designation', 'designation')
      .leftJoinAndSelect('a.department', 'department')
      .orderBy('a.isPinned', 'DESC')
      .addOrderBy('a.publishedAt', 'DESC')
      .take(50);

    if (!(all === 'true' && hasPermission(user, Permission.ANNOUNCEMENT_MANAGE))) {
      const me = user.employeeId ? await this.employees.findOne({ where: { id: user.employeeId } }) : null;
      qb.where('a.publishedAt <= :now', { now: new Date() })
        .andWhere(new Brackets((b) => b.where('a.expiresOn IS NULL').orWhere('a.expiresOn >= :today', { today: todayISO() })))
        .andWhere(
          new Brackets((b) => {
            b.where('a.departmentId IS NULL');
            if (me?.departmentId) b.orWhere('a.departmentId = :dept', { dept: me.departmentId });
          }),
        );
    }
    return qb.getMany();
  }

  @RequirePermissions(Permission.ANNOUNCEMENT_MANAGE)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) {
    return this.repo.save(
      this.repo.create({
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
        authorId: user.employeeId,
      }),
    );
  }

  @RequirePermissions(Permission.ANNOUNCEMENT_MANAGE)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAnnouncementDto) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Announcement not found');
    const { publishedAt, ...rest } = dto;
    Object.assign(row, rest);
    if (publishedAt) row.publishedAt = new Date(publishedAt);
    return this.repo.save(row);
  }

  @RequirePermissions(Permission.ANNOUNCEMENT_MANAGE)
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.repo.delete(id);
  }
}
