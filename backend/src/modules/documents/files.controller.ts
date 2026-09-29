import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { FileVisibility } from './entities/stored-file.entity.js';
import { FilesService } from './files.service.js';
import type { UploadedFile as Upload } from './files.service.js';

const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_MB ?? '10', 10) * 1024 * 1024;

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Upload | undefined,
    @Query('visibility') visibility?: FileVisibility,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    if (!this.files.isAllowedType(file.mimetype)) {
      throw new BadRequestException('Unsupported file type. Upload PDF, images, text or Office documents.');
    }
    return this.files.store(file, user, visibility === FileVisibility.COMPANY ? FileVisibility.COMPANY : FileVisibility.PRIVATE);
  }

  @Get(':id')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { file, absolute } = await this.files.resolveForDownload(id, user);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(absolute);
  }
}
