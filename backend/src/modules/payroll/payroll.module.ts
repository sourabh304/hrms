import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { EmploymentEvent } from '../employees/entities/employment-event.entity.js';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { LeaveRequest } from '../leave/entities/leave-request.entity.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { PayrollRun } from './entities/payroll-run.entity.js';
import { Payslip } from './entities/payslip.entity.js';
import { SalaryStructure } from './entities/salary-structure.entity.js';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalaryStructure, PayrollRun, Payslip, Employee, LeaveRequest, EmploymentEvent]),
    HolidaysModule,
    OrganizationModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
