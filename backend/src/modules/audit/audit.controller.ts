import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Permission } from '../../common/auth/roles.js';
import { RequirePermissions } from '../../common/decorators/index.js';
import { AuditService } from './audit.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@ApiTags('Audit')
@RequirePermissions(Permission.AUDIT_VIEW)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }

  @Get('resources')
  resources() {
    return this.audit.resources();
  }
}
