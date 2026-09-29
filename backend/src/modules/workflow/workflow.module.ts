import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { Department } from '../organization/entities/department.entity.js';
import { ApprovalRequest } from './entities/approval-request.entity.js';
import { ApprovalStep } from './entities/approval-step.entity.js';
import { WorkflowPolicy } from './entities/workflow-policy.entity.js';
import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowPolicy, ApprovalRequest, ApprovalStep, Employee, Department]),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
