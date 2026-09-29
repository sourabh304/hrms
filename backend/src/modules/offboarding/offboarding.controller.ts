import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import {
  CompleteSeparationDto,
  ExitInterviewDto,
  InitiateSeparationDto,
  ResignDto,
  SeparationQueryDto,
} from './dto/offboarding.dto.js';
import { OffboardingService } from './offboarding.service.js';

@ApiTags('Offboarding')
@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly offboarding: OffboardingService) {}

  @Get('separations')
  list(@CurrentUser() user: AuthUser, @Query() query: SeparationQueryDto) {
    return this.offboarding.list(user, query);
  }

  @Get('separations/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.offboarding.get(id);
  }

  @Post('resign')
  resign(@CurrentUser() user: AuthUser, @Body() dto: ResignDto) {
    return this.offboarding.resign(user, dto);
  }

  @RequirePermissions(Permission.OFFBOARDING_MANAGE)
  @Post('separations')
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiateSeparationDto) {
    return this.offboarding.initiate(dto, user);
  }

  @Post('separations/:id/withdraw')
  withdraw(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.offboarding.withdraw(id, user);
  }

  @Post('separations/:id/exit-interview')
  exitInterview(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExitInterviewDto,
  ) {
    return this.offboarding.exitInterview(id, dto, user);
  }

  @RequirePermissions(Permission.OFFBOARDING_MANAGE)
  @Post('separations/:id/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteSeparationDto,
  ) {
    return this.offboarding.complete(id, dto, user);
  }
}
