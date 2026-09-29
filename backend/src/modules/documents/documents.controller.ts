import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Permission } from '../../common/auth/roles.js';
import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto, DocumentQueryDto, UpdateDocumentDto } from './dto/document.dto.js';

@ApiTags('Documents & Policies')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: DocumentQueryDto) {
    return this.documents.list(user, query);
  }

  @Get('pending-acknowledgments')
  pending(@CurrentUser() user: AuthUser) {
    return this.documents.pendingForMe(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.get(id, user);
  }

  @RequirePermissions(Permission.DOCUMENT_MANAGE)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documents.create(dto, user);
  }

  @RequirePermissions(Permission.DOCUMENT_MANAGE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDocumentDto) {
    return this.documents.update(id, dto);
  }

  @RequirePermissions(Permission.DOCUMENT_MANAGE)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.remove(id);
  }

  @Post(':id/acknowledge')
  acknowledge(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documents.acknowledge(id, user);
  }

  @RequirePermissions(Permission.DOCUMENT_MANAGE)
  @Get(':id/acknowledgments')
  report(@Param('id', ParseUUIDPipe) id: string) {
    return this.documents.acknowledgmentReport(id);
  }
}
