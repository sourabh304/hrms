import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { DocumentCategory } from '../entities/document.entity.js';

export class CreateDocumentDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(DocumentCategory) category: DocumentCategory;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsUUID() fileId?: string;
  @IsOptional() @IsString() @MaxLength(20) version?: string;
  @IsOptional() @IsBoolean() requiresAcknowledgment?: boolean;
  /** Personal document for this employee (omit for company documents). */
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsDateString() expiresOn?: string;
}

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}

export class DocumentQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['company', 'personal']) scope: 'company' | 'personal' = 'company';
  @IsOptional() @IsEnum(DocumentCategory) category?: DocumentCategory;
  @IsOptional() @IsUUID() employeeId?: string;
}
