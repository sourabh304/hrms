import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ScopedQueryDto } from '../../../common/dto/pagination.dto.js';
import { AttendanceSource } from '../entities/attendance-record.entity.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class PunchDto {
  @IsOptional() @IsEnum(AttendanceSource) source?: AttendanceSource;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class MonthQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' })
  month: string;

  @IsOptional() @IsUUID() employeeId?: string;
}

export class RosterQueryDto {
  @IsDateString() date: string;
  @IsOptional() @IsIn(['team', 'all']) scope: 'team' | 'all' = 'team';
  @IsOptional() @IsUUID() departmentId?: string;
}

export class RegularizeDto {
  @IsDateString() date: string;
  @Matches(HHMM) checkIn: string;
  @Matches(HHMM) checkOut: string;
  @IsString() @MinLength(3) @MaxLength(500) reason: string;
}

export class RegularizationQueryDto extends ScopedQueryDto {}

export class CreateShiftDto {
  @IsString() @MaxLength(80) name: string;
  @IsString() @Length(2, 20) code: string;
  @Matches(HHMM) startTime: string;
  @Matches(HHMM) endTime: string;
  @IsOptional() @IsInt() @Min(0) graceMinutes?: number;
  @IsOptional() @IsInt() @Min(0) breakMinutes?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}
