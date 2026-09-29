import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ScopedQueryDto } from '../../../common/dto/pagination.dto.js';
import { SeparationType } from '../entities/separation.entity.js';

export class ResignDto {
  @IsString() @MinLength(10) @MaxLength(2000) reason: string;
  @IsDateString() requestedLastDay: string;
}

export class InitiateSeparationDto {
  @IsUUID() employeeId: string;
  @IsEnum(SeparationType) type: SeparationType;
  @IsString() @MinLength(5) reason: string;
  @IsDateString() lastDay: string;
}

export class ExitInterviewDto {
  @IsInt() @Min(1) @Max(5) overallRating: number;
  @IsString() @MaxLength(120) primaryReason: string;
  @IsBoolean() wouldRecommend: boolean;
  @IsString() @MaxLength(3000) feedback: string;
}

export class CompleteSeparationDto {
  @IsOptional() @IsBoolean() isRehireEligible?: boolean;
}

export class SeparationQueryDto extends ScopedQueryDto {}
