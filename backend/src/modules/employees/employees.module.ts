import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Designation } from '../organization/entities/designation.entity.js';
import { OrganizationModule } from '../organization/organization.module.js';
import { UsersModule } from '../users/users.module.js';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { Employee } from './entities/employee.entity.js';
import { EmploymentEvent } from './entities/employment-event.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmploymentEvent, Designation]),
    OrganizationModule,
    UsersModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
