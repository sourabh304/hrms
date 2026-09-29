import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { Feedback } from './entities/feedback.entity.js';
import { Goal } from './entities/goal.entity.js';
import { PerformanceReview } from './entities/performance-review.entity.js';
import { ReviewCycle } from './entities/review-cycle.entity.js';
import { PerformanceController } from './performance.controller.js';
import { PerformanceService } from './performance.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewCycle, Goal, PerformanceReview, Feedback, Employee])],
  controllers: [PerformanceController],
  providers: [PerformanceService],
})
export class PerformanceModule {}
