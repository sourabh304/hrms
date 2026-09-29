import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { Kudos } from '../engagement/entities/kudos.entity.js';
import { LeaveBalance } from '../leave/entities/leave-balance.entity.js';
import { LeaveRequest } from '../leave/entities/leave-request.entity.js';
import { Separation } from '../offboarding/entities/separation.entity.js';
import { PayrollRun } from '../payroll/entities/payroll-run.entity.js';
import { JobOpening } from '../recruitment/entities/job-opening.entity.js';
import { ApprovalRequest } from '../workflow/entities/approval-request.entity.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      AttendanceRecord,
      LeaveRequest,
      LeaveBalance,
      JobOpening,
      PayrollRun,
      ApprovalRequest,
      Separation,
      Kudos,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
