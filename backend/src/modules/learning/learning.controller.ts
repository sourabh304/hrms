import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { AssignCourseDto, CourseQueryDto, CreateCourseDto, ProgressDto, UpdateCourseDto } from './dto/learning.dto.js';
import { LearningService } from './learning.service.js';

@ApiTags('Learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('courses')
  catalog(@CurrentUser() user: AuthUser, @Query() query: CourseQueryDto) {
    return this.learning.catalog(user, query);
  }

  @Get('categories')
  categories() {
    return this.learning.categories();
  }

  @Get('courses/:id')
  course(@Param('id', ParseUUIDPipe) id: string) {
    return this.learning.getCourse(id);
  }

  @RequirePermissions(Permission.LEARNING_MANAGE)
  @Post('courses')
  create(@Body() dto: CreateCourseDto) {
    return this.learning.createCourse(dto);
  }

  @RequirePermissions(Permission.LEARNING_MANAGE)
  @Patch('courses/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCourseDto) {
    return this.learning.updateCourse(id, dto);
  }

  @RequirePermissions(Permission.LEARNING_MANAGE)
  @Get('courses/:id/enrollments')
  enrollments(@Param('id', ParseUUIDPipe) id: string) {
    return this.learning.courseEnrollments(id);
  }

  @Post('courses/:id/enroll')
  enroll(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.enroll(user, id);
  }

  @Post('assign')
  assign(@CurrentUser() user: AuthUser, @Body() dto: AssignCourseDto) {
    return this.learning.assign(user, dto);
  }

  @Get('enrollments/me')
  mine(@CurrentUser() user: AuthUser) {
    return this.learning.myEnrollments(user);
  }

  @Patch('enrollments/:id/progress')
  progress(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProgressDto) {
    return this.learning.updateProgress(id, user, dto.progress);
  }

  @RequirePermissions(Permission.LEARNING_MANAGE)
  @Get('stats')
  stats() {
    return this.learning.stats();
  }
}
