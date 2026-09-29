import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import {
  CreateEmployeeDto,
  EmployeeQueryDto,
  UpdateEmployeeDto,
  UpdateMyProfileDto,
} from './dto/employee.dto.js';
import { EmployeesService } from './employees.service.js';

@ApiTags('Employees (Core HR)')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @RequirePermissions(Permission.EMPLOYEE_READ)
  @Get()
  list(@Query() query: EmployeeQueryDto, @CurrentUser() user: AuthUser) {
    return this.employees.list(query, user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.employees.me(user);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMyProfileDto) {
    return this.employees.updateMe(user, dto);
  }

  @Get('lookup')
  lookup(@Query('search') search?: string) {
    return this.employees.lookup(search);
  }

  @Get('org-chart')
  orgChart() {
    return this.employees.orgChart();
  }

  @Get('celebrations')
  celebrations(@Query('days', new ParseIntPipe({ optional: true })) days?: number) {
    return this.employees.celebrations(days ?? 30);
  }

  @RequirePermissions(Permission.EMPLOYEE_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.employees.findOne(id, user);
  }

  @RequirePermissions(Permission.EMPLOYEE_READ)
  @Get(':id/timeline')
  timeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.employees.timeline(id);
  }

  @RequirePermissions(Permission.EMPLOYEE_WRITE)
  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.employees.create(dto, user);
  }

  @RequirePermissions(Permission.EMPLOYEE_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employees.update(id, dto, user);
  }
}
