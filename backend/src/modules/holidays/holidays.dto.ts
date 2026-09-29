import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { HolidayType } from './entities/holiday.entity.js';

export class CreateHolidayDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;

  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {}

export class HolidayQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
