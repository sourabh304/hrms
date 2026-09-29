import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { Course } from './entities/course.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { LearningController } from './learning.controller.js';
import { LearningService } from './learning.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Enrollment, Employee])],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
