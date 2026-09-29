import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../../common/auth/roles.js';
import { RequirePermissions } from '../../common/decorators/index.js';
import { AnalyticsService } from './analytics.service.js';

@ApiTags('People Analytics')
@RequirePermissions(Permission.ANALYTICS_VIEW)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('workforce')
  workforce() {
    return this.analytics.workforce();
  }
}
