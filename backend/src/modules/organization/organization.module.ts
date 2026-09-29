import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { CompanySettings } from './entities/company-settings.entity.js';
import { Department } from './entities/department.entity.js';
import { Designation } from './entities/designation.entity.js';
import { Location } from './entities/location.entity.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Designation, Location, CompanySettings, Employee])],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
