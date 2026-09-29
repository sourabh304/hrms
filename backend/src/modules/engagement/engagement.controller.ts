import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { CreateSurveyDto, GiveKudosDto, SurveyAnswerDto, SurveyStatusDto } from './dto/engagement.dto.js';
import { EngagementService } from './engagement.service.js';

@ApiTags('Engagement')
@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Get('kudos')
  kudos() {
    return this.engagement.kudosFeed();
  }

  @Post('kudos')
  giveKudos(@CurrentUser() user: AuthUser, @Body() dto: GiveKudosDto) {
    return this.engagement.giveKudos(user, dto);
  }

  @Post('kudos/:id/like')
  like(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.toggleLike(id, user);
  }

  @Get('kudos/leaderboard')
  leaderboard() {
    return this.engagement.leaderboard();
  }

  @Get('surveys')
  surveys(@CurrentUser() user: AuthUser) {
    return this.engagement.listSurveys(user);
  }

  @Get('surveys/:id')
  survey(@Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.getSurvey(id);
  }

  @RequirePermissions(Permission.ENGAGEMENT_MANAGE)
  @Post('surveys')
  createSurvey(@CurrentUser() user: AuthUser, @Body() dto: CreateSurveyDto) {
    return this.engagement.createSurvey(user, dto);
  }

  @RequirePermissions(Permission.ENGAGEMENT_MANAGE)
  @Post('surveys/:id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SurveyStatusDto) {
    return this.engagement.setStatus(id, dto.status);
  }

  @Post('surveys/:id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SurveyAnswerDto) {
    return this.engagement.respond(id, user, dto.answers);
  }

  @RequirePermissions(Permission.ENGAGEMENT_MANAGE)
  @Get('surveys/:id/results')
  results(@Param('id', ParseUUIDPipe) id: string) {
    return this.engagement.results(id);
  }
}
