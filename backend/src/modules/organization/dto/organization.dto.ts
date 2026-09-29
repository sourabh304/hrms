import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { WEEKDAYS } from '../../../common/utils/dates.js';
import type { Weekday } from '../../../common/utils/dates.js';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @Length(2, 20)
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsUUID()
  headId?: string | null;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDesignationDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(10)
  level: string;

  @IsOptional()
  @IsString()
  jobFamily?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDesignationDto extends PartialType(CreateDesignationDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLocationDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @Length(2, 20)
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TaxSlabDto {
  @IsNumber()
  @Min(0)
  from: number;

  @IsOptional()
  @IsNumber()
  to: number | null;

  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent: number;
}

export class UpdateSettingsDto {
  @IsOptional() @IsString() @MaxLength(160) companyName?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() dateFormat?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearStartMonth?: number;
  @IsOptional() @IsArray() @IsIn(WEEKDAYS, { each: true }) weeklyOffs?: Weekday[];
  @IsOptional() @IsInt() @Min(1) @Max(24) standardWorkHours?: number;
  @IsOptional() @IsInt() @Min(0) probationDays?: number;
  @IsOptional() @IsInt() @Min(0) noticePeriodDays?: number;
  @IsOptional() @IsString() @MaxLength(10) employeeCodePrefix?: string;
  @IsOptional() @IsString() @MaxLength(120) emailDomain?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxSlabDto)
  taxSlabs?: TaxSlabDto[];
}
