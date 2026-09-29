import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { AnnouncementsController } from './announcements.controller.js';
import { Announcement } from './entities/announcement.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, Employee])],
  controllers: [AnnouncementsController],
})
export class AnnouncementsModule {}
