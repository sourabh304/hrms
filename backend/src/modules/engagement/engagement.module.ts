import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { EngagementController } from './engagement.controller.js';
import { EngagementService } from './engagement.service.js';
import { Kudos } from './entities/kudos.entity.js';
import { Survey, SurveyResponse } from './entities/survey.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Kudos, Survey, SurveyResponse, Employee])],
  controllers: [EngagementController],
  providers: [EngagementService],
})
export class EngagementModule {}
