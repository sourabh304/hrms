import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module.js';
import { OnboardingModule } from '../onboarding/onboarding.module.js';
import { UsersModule } from '../users/users.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { Separation } from './entities/separation.entity.js';
import { OffboardingController } from './offboarding.controller.js';
import { OffboardingService } from './offboarding.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Separation]),
    EmployeesModule,
    UsersModule,
    OnboardingModule,
    WorkflowModule,
  ],
  controllers: [OffboardingController],
  providers: [OffboardingService],
})
export class OffboardingModule {}
