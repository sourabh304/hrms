import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { CreateExpenseDto, ExpenseQueryDto, ReimburseDto, UpdateExpenseDto } from './dto/expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@ApiTags('Expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ExpenseQueryDto) {
    return this.expenses.list(user, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser, @Query('scope') scope?: 'me' | 'all') {
    return this.expenses.summary(user, scope === 'all' ? 'all' : 'me');
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.expenses.get(id, user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenses.update(id, user, dto);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.expenses.submit(id, user);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.expenses.cancel(id, user);
  }

  @RequirePermissions(Permission.EXPENSE_MANAGE)
  @Post(':id/reimburse')
  reimburse(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReimburseDto) {
    return this.expenses.reimburse(id, dto);
  }
}
