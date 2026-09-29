import { Body, Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import {
  BulkDecisionDto,
  DecisionDto,
  InboxQueryDto,
  RequestQueryDto,
  UpdatePolicyDto,
} from './dto/workflow.dto.js';
import { WorkflowService } from './workflow.service.js';
import { StepStatus, WorkflowType } from './workflow.types.js';

@ApiTags('Workflow & Approvals')
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser, @Query() query: InboxQueryDto) {
    return this.workflow.inbox(user, query.type);
  }

  @Get('inbox/count')
  async inboxCount(@CurrentUser() user: AuthUser) {
    return { count: await this.workflow.inboxCount(user) };
  }

  @Post('inbox/bulk')
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkDecisionDto) {
    return this.workflow.bulkDecide(
      dto.requestIds,
      user,
      dto.decision === 'APPROVED' ? StepStatus.APPROVED : StepStatus.REJECTED,
      dto.comment,
    );
  }

  @Get('requests')
  list(@CurrentUser() user: AuthUser, @Query() query: RequestQueryDto) {
    return this.workflow.listRequests(user, query);
  }

  @Get('requests/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflow.getRequest(id, user);
  }

  @Get('entity/:type/:entityId')
  forEntity(
    @Param('type', new ParseEnumPipe(WorkflowType)) type: WorkflowType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.workflow.latestForEntity(type, entityId);
  }

  @Post('requests/:id/approve')
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.workflow.decide(id, user, StepStatus.APPROVED, dto.comment);
  }

  @Post('requests/:id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionDto,
  ) {
    return this.workflow.decide(id, user, StepStatus.REJECTED, dto.comment);
  }

  @Get('policies')
  policies() {
    return this.workflow.listPolicies();
  }

  @RequirePermissions(Permission.WORKFLOW_MANAGE)
  @Put('policies/:type')
  updatePolicy(
    @Param('type', new ParseEnumPipe(WorkflowType)) type: WorkflowType,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.workflow.updatePolicy(type, dto);
  }
}
