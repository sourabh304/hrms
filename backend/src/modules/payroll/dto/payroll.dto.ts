import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import type { Calculation, ComponentType } from '../payroll.calculator.js';

export class SalaryComponentDto {
  @IsString() @MaxLength(20) code: string;
  @IsString() @MaxLength(80) name: string;
  @IsIn(['EARNING', 'DEDUCTION']) type: ComponentType;
  @IsIn(['FIXED', 'PERCENT_OF_CTC', 'PERCENT_OF_BASIC', 'BALANCE']) calculation: Calculation;
  @IsNumber() @Min(0) value: number;
}

export class UpsertSalaryStructureDto {
  @IsNumber() @Min(0) annualCtc: number;
  @IsDateString() effectiveFrom: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentDto)
  components?: SalaryComponentDto[];
}

export class CreatePayrollRunDto {
  @IsInt() @Min(2000) year: number;
  @IsInt() @Min(1) @Max(12) month: number;
  @IsOptional() @IsString() notes?: string;
}

export class StructureQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['all', 'missing']) filter?: 'all' | 'missing';
}
