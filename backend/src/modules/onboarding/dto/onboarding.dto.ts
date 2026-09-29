import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { JourneyStatus } from '../entities/journey.entity.js';
import { JourneyType } from '../entities/journey-template.entity.js';
import type { TaskAssignee } from '../entities/journey-template.entity.js';
import { TaskStatus } from '../entities/journey-task.entity.js';

export class TemplateTaskDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() description?: string;
  @IsString() category: string;
  @IsIn(['HR', 'IT', 'FINANCE', 'MANAGER', 'EMPLOYEE']) assignee: TaskAssignee;
  @IsInt() dueOffsetDays: number;
}

export class CreateTemplateDto {
  @IsString() @MaxLength(120) name: string;
  @IsEnum(JourneyType) type: JourneyType;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateTaskDto) tasks: TemplateTaskDto[];
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

export class StartJourneyDto {
  @IsUUID() employeeId: string;
  @IsOptional() @IsUUID() templateId?: string;
  @IsEnum(JourneyType) type: JourneyType;
  @IsOptional() @IsDateString() startDate?: string;
}

export class JourneyQueryDto {
  @IsOptional() @IsEnum(JourneyType) type?: JourneyType;
  @IsOptional() @IsEnum(JourneyStatus) status?: JourneyStatus;
}

export class UpdateTaskDto {
  @IsEnum(TaskStatus) status: TaskStatus;
}
