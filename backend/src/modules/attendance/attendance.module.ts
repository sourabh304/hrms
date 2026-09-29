import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { LeaveRequest } from '../leave/entities/leave-request.entity.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceRecord } from './entities/attendance-record.entity.js';
import { Regularization } from './entities/regularization.entity.js';
import { Shift } from './entities/shift.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, Shift, Regularization, Employee, LeaveRequest]),
    HolidaysModule,
    WorkflowModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
