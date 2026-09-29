import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { ScopedQueryDto } from '../../../common/dto/pagination.dto.js';
import { ExpenseCategory } from '../entities/expense-claim.entity.js';

export class CreateExpenseDto {
  @IsString() @MaxLength(160) title: string;
  @IsEnum(ExpenseCategory) category: ExpenseCategory;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsDateString() expenseDate: string;
  @IsOptional() @IsString() @MaxLength(120) merchant?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() receiptFileId?: string;
  /** Submit for approval immediately (default true); false saves a draft. */
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ExpenseQueryDto extends ScopedQueryDto {
  @IsOptional() @IsEnum(ExpenseCategory) category?: ExpenseCategory;
}

export class ReimburseDto {
  @IsOptional() @IsString() @MaxLength(80) paymentReference?: string;
}
