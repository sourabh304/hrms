import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { DocumentAcknowledgment } from './entities/document-acknowledgment.entity.js';
import { Document } from './entities/document.entity.js';
import { StoredFile } from './entities/stored-file.entity.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentAcknowledgment, StoredFile, Employee])],
  controllers: [DocumentsController, FilesController],
  providers: [DocumentsService, FilesService],
  exports: [FilesService],
})
export class DocumentsModule {}
