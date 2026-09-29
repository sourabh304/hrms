import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { CreatePayrollRunDto, StructureQueryDto, UpsertSalaryStructureDto } from './dto/payroll.dto.js';
import { PayrollService } from './payroll.service.js';

@ApiTags('Payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  // Self-service
  @Get('payslips/me')
  myPayslips(@CurrentUser() user: AuthUser) {
    return this.payroll.myPayslips(user);
  }

  @Get('payslips/:id')
  payslip(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.getPayslip(id, user);
  }

  @Get('salary-structures/:employeeId')
  structure(@CurrentUser() user: AuthUser, @Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.payroll.getStructure(employeeId, user);
  }

  // Administration
  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Get('components/defaults')
  defaults() {
    return this.payroll.defaultComponents();
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Get('salary-structures')
  structures(@Query() query: StructureQueryDto) {
    return this.payroll.listStructures(query);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Put('salary-structures/:employeeId')
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpsertSalaryStructureDto,
  ) {
    return this.payroll.upsertStructure(employeeId, dto, user);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Get('runs')
  runs() {
    return this.payroll.listRuns();
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Get('summary')
  summary() {
    return this.payroll.summary();
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Post('runs')
  createRun(@CurrentUser() user: AuthUser, @Body() dto: CreatePayrollRunDto) {
    return this.payroll.createRun(dto, user);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Get('runs/:id')
  run(@Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.getRun(id);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Post('runs/:id/recalculate')
  recalculate(@Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.recalculate(id);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Post('runs/:id/finalize')
  finalize(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.finalize(id, user);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Post('runs/:id/mark-paid')
  markPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.markPaid(id);
  }

  @RequirePermissions(Permission.PAYROLL_MANAGE)
  @Delete('runs/:id')
  @HttpCode(204)
  deleteRun(@Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.deleteRun(id);
  }
}
