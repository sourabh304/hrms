import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import {
  CreateTemplateDto,
  JourneyQueryDto,
  StartJourneyDto,
  UpdateTaskDto,
  UpdateTemplateDto,
} from './dto/onboarding.dto.js';
import { JourneyType } from './entities/journey-template.entity.js';
import { OnboardingService } from './onboarding.service.js';

@ApiTags('Onboarding & Journeys')
@Controller('journeys')
export class OnboardingController {
  constructor(private readonly journeys: OnboardingService) {}

  @Get('templates')
  templates(@Query('type') type?: JourneyType) {
    return this.journeys.listTemplates(type);
  }

  @RequirePermissions(Permission.ONBOARDING_MANAGE)
  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.journeys.createTemplate(dto);
  }

  @RequirePermissions(Permission.ONBOARDING_MANAGE)
  @Patch('templates/:id')
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto) {
    return this.journeys.updateTemplate(id, dto);
  }

  @RequirePermissions(Permission.ONBOARDING_MANAGE)
  @Delete('templates/:id')
  @HttpCode(204)
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.journeys.deleteTemplate(id);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: JourneyQueryDto) {
    return this.journeys.list(user, query);
  }

  @RequirePermissions(Permission.ONBOARDING_MANAGE)
  @Post()
  start(@Body() dto: StartJourneyDto) {
    return this.journeys.start(dto);
  }

  @Get('tasks/me')
  myTasks(@CurrentUser() user: AuthUser) {
    return this.journeys.myTasks(user);
  }

  @Patch('tasks/:id')
  updateTask(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.journeys.updateTask(id, dto.status, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.journeys.get(id);
  }
}
