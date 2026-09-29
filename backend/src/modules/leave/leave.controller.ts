import { Body, Controller, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import {
  AdjustBalanceDto,
  AllocateDto,
  ApplyLeaveDto,
  BalanceQueryDto,
  CreateLeaveTypeDto,
  LeaveCalendarQueryDto,
  LeavePreviewDto,
  LeaveQueryDto,
  UpdateLeaveTypeDto,
} from './dto/leave.dto.js';
import { LeaveService } from './leave.service.js';

@ApiTags('Leave (Time Off)')
@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  // Types
  @Get('types')
  types(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.leave.listTypes(includeInactive);
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Post('types')
  createType(@Body() dto: CreateLeaveTypeDto) {
    return this.leave.createType(dto);
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Patch('types/:id')
  updateType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.leave.updateType(id, dto);
  }

  // Balances
  @Get('balances')
  balances(@CurrentUser() user: AuthUser, @Query() query: BalanceQueryDto) {
    return this.leave.balancesFor(user, query.employeeId, query.year ?? new Date().getFullYear());
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Post('balances/allocate')
  allocate(@Body() dto: AllocateDto) {
    return this.leave.allocateYear(dto.year);
  }

  @RequirePermissions(Permission.LEAVE_MANAGE)
  @Patch('balances/:id')
  adjust(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdjustBalanceDto) {
    return this.leave.adjustBalance(id, dto);
  }

  // Requests
  @Get('preview')
  preview(@CurrentUser() user: AuthUser, @Query() q: LeavePreviewDto) {
    return this.leave.preview(user, q.startDate, q.endDate, q.isHalfDay);
  }

  @Get('requests')
  list(@CurrentUser() user: AuthUser, @Query() query: LeaveQueryDto) {
    return this.leave.list(user, query);
  }

  @Post('requests')
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyLeaveDto) {
    return this.leave.apply(user, dto);
  }

  @Get('requests/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.leave.getOne(id);
  }

  @Post('requests/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.leave.cancel(id, user);
  }

  @Get('calendar')
  calendar(@CurrentUser() user: AuthUser, @Query() query: LeaveCalendarQueryDto) {
    return this.leave.calendarView(user, query);
  }
}
