import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationModule } from '../organization/organization.module.js';
import { WorkflowModule } from '../workflow/workflow.module.js';
import { ExpenseClaim } from './entities/expense-claim.entity.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseClaim]), WorkflowModule, OrganizationModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
