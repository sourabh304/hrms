import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import {
  CalibrateDto,
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
import { PerformanceService } from './performance.service.js';

enum FeedbackDirection {
  received = 'received',
  given = 'given',
  team = 'team',
}

@ApiTags('Performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  // Cycles
  @Get('cycles')
  cycles() {
    return this.performance.listCycles();
  }

  @RequirePermissions(Permission.PERFORMANCE_MANAGE)
  @Post('cycles')
  createCycle(@Body() dto: CreateCycleDto) {
    return this.performance.createCycle(dto);
  }

  @RequirePermissions(Permission.PERFORMANCE_MANAGE)
  @Patch('cycles/:id')
  updateCycle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCycleDto) {
    return this.performance.updateCycle(id, dto);
  }

  @RequirePermissions(Permission.PERFORMANCE_MANAGE)
  @Post('cycles/:id/launch')
  launch(@Param('id', ParseUUIDPipe) id: string) {
    return this.performance.launch(id);
  }

  @RequirePermissions(Permission.PERFORMANCE_MANAGE)
  @Get('cycles/:id/stats')
  stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.performance.cycleStats(id);
  }

  // Goals
  @Get('goals')
  goals(@CurrentUser() user: AuthUser, @Query() query: GoalQueryDto) {
    return this.performance.listGoals(user, query);
  }

  @Post('goals')
  createGoal(@CurrentUser() user: AuthUser, @Body() dto: CreateGoalDto) {
    return this.performance.createGoal(user, dto);
  }

  @Patch('goals/:id')
  updateGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGoalDto) {
    return this.performance.updateGoal(id, user, dto);
  }

  @Delete('goals/:id')
  @HttpCode(204)
  deleteGoal(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.performance.deleteGoal(id, user);
  }

  // Reviews
  @Get('reviews')
  reviews(@CurrentUser() user: AuthUser, @Query() query: ReviewQueryDto) {
    return this.performance.listReviews(user, query);
  }

  @Get('reviews/:id')
  review(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.performance.getReview(id, user);
  }

  @Post('reviews/:id/self')
  submitSelf(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SelfReviewDto) {
    return this.performance.submitSelf(id, user, dto);
  }

  @Post('reviews/:id/manager')
  submitManager(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManagerReviewDto,
  ) {
    return this.performance.submitManager(id, user, dto);
  }

  @RequirePermissions(Permission.PERFORMANCE_MANAGE)
  @Post('reviews/:id/calibrate')
  calibrate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CalibrateDto) {
    return this.performance.calibrate(id, dto.finalRating);
  }

  // Feedback
  @Get('feedback/:direction')
  feedback(
    @CurrentUser() user: AuthUser,
    @Param('direction', new ParseEnumPipe(FeedbackDirection)) direction: FeedbackDirection,
  ) {
    return this.performance.listFeedback(user, direction);
  }

  @Post('feedback')
  giveFeedback(@CurrentUser() user: AuthUser, @Body() dto: GiveFeedbackDto) {
    return this.performance.giveFeedback(user, dto);
  }
}
