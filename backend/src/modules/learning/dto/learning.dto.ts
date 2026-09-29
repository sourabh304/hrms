import { PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { CourseFormat, CourseLevel, CourseStatus } from '../entities/course.entity.js';

export class CreateCourseDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() description: string;
  @IsString() @MaxLength(80) category: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsNumber() @Min(0.5) durationHours?: number;
  @IsOptional() @IsEnum(CourseLevel) level?: CourseLevel;
  @IsOptional() @IsEnum(CourseFormat) format?: CourseFormat;
  @IsOptional() @IsUrl() contentUrl?: string;
  @IsOptional() @IsBoolean() isMandatory?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsEnum(CourseStatus) status?: CourseStatus;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CourseQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsEnum(CourseLevel) level?: CourseLevel;
}

export class AssignCourseDto {
  @IsUUID() courseId: string;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) employeeIds?: string[];
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class ProgressDto {
  @IsInt() @Min(0) @Max(100) progress: number;
}
