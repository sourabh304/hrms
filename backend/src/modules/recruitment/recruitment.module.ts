import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { PayrollModule } from '../payroll/payroll.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { Candidate } from './entities/candidate.entity.js';
import { Interview } from './entities/interview.entity.js';
import { JobApplication } from './entities/job-application.entity.js';
import { JobOpening } from './entities/job-opening.entity.js';
import { CareersController, RecruitmentController } from './recruitment.controller.js';
import { RecruitmentService } from './recruitment.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobOpening, Candidate, JobApplication, Interview]),
    EmployeesModule,
    OrganizationModule,
    PayrollModule,
    WorkflowModule,
  ],
  controllers: [RecruitmentController, CareersController],
  providers: [RecruitmentService],
})
export class RecruitmentModule {}
