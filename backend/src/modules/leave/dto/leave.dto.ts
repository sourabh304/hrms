import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ScopedQueryDto } from '../../../common/dto/pagination.dto.js';
import { Gender } from '../../employees/entities/employee.entity.js';

export class CreateLeaveTypeDto {
  @IsString() @MaxLength(80) name: string;
  @IsString() @Length(1, 10) code: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsNumber() @Min(0) annualQuota: number;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @IsBoolean() carryForward?: boolean;
  @IsOptional() @IsNumber() @Min(0) maxCarryForward?: number;
  @IsOptional() @IsBoolean() allowHalfDay?: boolean;
  @IsOptional() @IsInt() @Min(1) maxConsecutiveDays?: number | null;
  @IsOptional() @IsEnum(Gender) applicableGender?: Gender | null;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ApplyLeaveDto {
  @IsUUID() leaveTypeId: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsBoolean() isHalfDay?: boolean;
  @IsOptional() @IsIn(['FIRST', 'SECOND']) halfDaySession?: 'FIRST' | 'SECOND';
  @IsString() @MinLength(3) @MaxLength(1000) reason: string;
}

export class LeaveQueryDto extends ScopedQueryDto {
  @IsOptional() @IsUUID() leaveTypeId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class LeaveCalendarQueryDto {
  @IsDateString() from: string;
  @IsDateString() to: string;
  @IsOptional() @IsIn(['team', 'all']) scope: 'team' | 'all' = 'team';
  @IsOptional() @IsUUID() departmentId?: string;
}

export class LeavePreviewDto {
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isHalfDay?: boolean;
}

export class BalanceQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @IsUUID() employeeId?: string;
}

export class AllocateDto {
  @IsInt() @Min(2000) year: number;
}

export class AdjustBalanceDto {
  @IsNumber() @Min(0) allocated: number;
  @IsOptional() @IsString() note?: string;
}
