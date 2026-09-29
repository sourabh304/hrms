import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import {
  ApplicationQueryDto,
  CandidateQueryDto,
  CreateApplicationDto,
  CreateCandidateDto,
  CreateJobDto,
  HireDto,
  InterviewFeedbackDto,
  JobQueryDto,
  JobStatusDto,
  MoveStageDto,
  PublicApplyDto,
  RateApplicationDto,
  ReferralDto,
  ScheduleInterviewDto,
  UpdateCandidateDto,
  UpdateInterviewDto,
  UpdateJobDto,
} from './dto/recruitment.dto.js';
import { RecruitmentService } from './recruitment.service.js';

@ApiTags('Recruitment (ATS)')
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitment: RecruitmentService) {}

  // Jobs
  @Get('jobs')
  jobs(@CurrentUser() user: AuthUser, @Query() query: JobQueryDto) {
    return this.recruitment.listJobs(user, query);
  }

  @Get('jobs/:id')
  job(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitment.getJob(id);
  }

  @Post('jobs')
  createJob(@CurrentUser() user: AuthUser, @Body() dto: CreateJobDto) {
    return this.recruitment.createJob(dto, user);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Patch('jobs/:id')
  updateJob(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateJobDto) {
    return this.recruitment.updateJob(id, dto);
  }

  @Post('jobs/:id/submit')
  submitJob(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.recruitment.submitJob(id, user);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Post('jobs/:id/status')
  setJobStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: JobStatusDto) {
    return this.recruitment.setJobStatus(id, dto.status);
  }

  @Get('jobs/:id/pipeline')
  pipeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitment.pipeline(id);
  }

  // Candidates
  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Get('candidates')
  candidates(@Query() query: CandidateQueryDto) {
    return this.recruitment.listCandidates(query);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Get('candidates/:id')
  candidate(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitment.getCandidate(id);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Post('candidates')
  createCandidate(@Body() dto: CreateCandidateDto) {
    return this.recruitment.createCandidate(dto);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Patch('candidates/:id')
  updateCandidate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCandidateDto) {
    return this.recruitment.updateCandidate(id, dto);
  }

  // Applications
  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Get('applications')
  applications(@Query() query: ApplicationQueryDto) {
    return this.recruitment.listApplications(query);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Post('applications')
  createApplication(@Body() dto: CreateApplicationDto) {
    return this.recruitment.createApplication(dto);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Post('applications/:id/stage')
  moveStage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveStageDto) {
    return this.recruitment.moveStage(id, dto);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Post('applications/:id/rate')
  rate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RateApplicationDto) {
    return this.recruitment.rate(id, dto.rating);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE, Permission.EMPLOYEE_WRITE)
  @Post('applications/:id/hire')
  hire(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: HireDto) {
    return this.recruitment.hire(id, dto, user);
  }

  // Interviews
  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Post('applications/:id/interviews')
  schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ScheduleInterviewDto) {
    return this.recruitment.scheduleInterview(id, dto);
  }

  @Get('interviews/me')
  myInterviews(@CurrentUser() user: AuthUser) {
    return this.recruitment.myInterviews(user);
  }

  @Post('interviews/:id/feedback')
  feedback(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InterviewFeedbackDto,
  ) {
    return this.recruitment.submitFeedback(id, dto, user);
  }

  @RequirePermissions(Permission.RECRUITMENT_MANAGE)
  @Patch('interviews/:id')
  updateInterview(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInterviewDto) {
    return this.recruitment.updateInterview(id, dto);
  }

  // Referrals
  @Post('referrals')
  refer(@CurrentUser() user: AuthUser, @Body() dto: ReferralDto) {
    return this.recruitment.refer(dto, user);
  }

  @Get('referrals/me')
  myReferrals(@CurrentUser() user: AuthUser) {
    return this.recruitment.myReferrals(user);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.recruitment.stats(user);
  }
}

/** Unauthenticated endpoints backing the public careers site. */
@ApiTags('Careers (public)')
@Public()
@Controller('careers')
export class CareersController {
  constructor(private readonly recruitment: RecruitmentService) {}

  @Get('jobs')
  jobs() {
    return this.recruitment.publicJobs();
  }

  @Get('jobs/:id')
  job(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruitment.publicJob(id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('jobs/:id/apply')
  apply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublicApplyDto) {
    return this.recruitment.publicApply(id, dto);
  }
}
