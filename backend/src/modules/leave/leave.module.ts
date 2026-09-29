import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { HolidaysModule } from '../holidays/holidays.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { LeaveBalance } from './entities/leave-balance.entity.js';
import { LeaveRequest } from './entities/leave-request.entity.js';
import { LeaveType } from './entities/leave-type.entity.js';
import { LeaveController } from './leave.controller.js';
import { LeaveService } from './leave.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveType, LeaveBalance, LeaveRequest, Employee]),
    HolidaysModule,
    WorkflowModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
