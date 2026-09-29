import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySettings } from '../organization/entities/company-settings.entity.js';
import { CalendarService } from './calendar.service.js';
import { Holiday } from './entities/holiday.entity.js';
import { HolidaysController } from './holidays.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday, CompanySettings])],
  controllers: [HolidaysController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class HolidaysModule {}
