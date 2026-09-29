import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { AttendanceService } from './attendance.service.js';
import {
  CreateShiftDto,
  MonthQueryDto,
  PunchDto,
  RegularizationQueryDto,
  RegularizeDto,
  RosterQueryDto,
  UpdateShiftDto,
} from './dto/attendance.dto.js';

@ApiTags('Attendance & Time')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('today')
  today(@CurrentUser() user: AuthUser) {
    return this.attendance.today(user);
  }

  @Post('clock-in')
  clockIn(@CurrentUser() user: AuthUser, @Body() dto: PunchDto) {
    return this.attendance.clockIn(user, dto);
  }

  @Post('clock-out')
  clockOut(@CurrentUser() user: AuthUser, @Body() dto: PunchDto) {
    return this.attendance.clockOut(user, dto);
  }

  @Get('month')
  month(@CurrentUser() user: AuthUser, @Query() query: MonthQueryDto) {
    return this.attendance.month(user, query);
  }

  @Get('roster')
  roster(@CurrentUser() user: AuthUser, @Query() query: RosterQueryDto) {
    return this.attendance.roster(user, query);
  }

  @Get('regularizations')
  regularizations(@CurrentUser() user: AuthUser, @Query() query: RegularizationQueryDto) {
    return this.attendance.listRegularizations(user, query);
  }

  @Post('regularizations')
  regularize(@CurrentUser() user: AuthUser, @Body() dto: RegularizeDto) {
    return this.attendance.regularize(user, dto);
  }

  @Get('shifts')
  shifts() {
    return this.attendance.listShifts();
  }

  @RequirePermissions(Permission.ATTENDANCE_MANAGE)
  @Post('shifts')
  createShift(@Body() dto: CreateShiftDto) {
    return this.attendance.createShift(dto);
  }

  @RequirePermissions(Permission.ATTENDANCE_MANAGE)
  @Patch('shifts/:id')
  updateShift(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateShiftDto) {
    return this.attendance.updateShift(id, dto);
  }
}
