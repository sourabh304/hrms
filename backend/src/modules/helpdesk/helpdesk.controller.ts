import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { CommentDto, CreateTicketDto, RateTicketDto, TicketQueryDto, UpdateTicketDto } from './dto/helpdesk.dto.js';
import { HelpdeskService } from './helpdesk.service.js';

@ApiTags('Helpdesk')
@Controller('helpdesk/tickets')
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: TicketQueryDto) {
    return this.helpdesk.list(user, query);
  }

  @RequirePermissions(Permission.HELPDESK_MANAGE)
  @Get('stats')
  stats() {
    return this.helpdesk.stats();
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.helpdesk.get(id, user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.helpdesk.create(user, dto);
  }

  @RequirePermissions(Permission.HELPDESK_MANAGE)
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto) {
    return this.helpdesk.update(id, dto, user);
  }

  @Post(':id/comments')
  comment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CommentDto) {
    return this.helpdesk.comment(id, dto, user);
  }

  @Post(':id/rate')
  rate(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RateTicketDto) {
    return this.helpdesk.rate(id, dto.satisfaction, user);
  }
}
