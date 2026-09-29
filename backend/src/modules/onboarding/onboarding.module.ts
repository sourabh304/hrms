import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { JourneyTask } from './entities/journey-task.entity.js';
import { JourneyTemplate } from './entities/journey-template.entity.js';
import { Journey } from './entities/journey.entity.js';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([JourneyTemplate, Journey, JourneyTask, Employee])],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
