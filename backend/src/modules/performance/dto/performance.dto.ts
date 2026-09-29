import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CycleStatus, CycleType } from '../entities/review-cycle.entity.js';
import { FeedbackType, FeedbackVisibility } from '../entities/feedback.entity.js';
import { GoalCategory, GoalStatus } from '../entities/goal.entity.js';

export class CreateCycleDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsEnum(CycleType) type?: CycleType;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsDateString() selfReviewDue: string;
  @IsDateString() managerReviewDue: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) competencies: string[];
}

export class UpdateCycleDto extends PartialType(CreateCycleDto) {
  @IsOptional() @IsEnum(CycleStatus) status?: CycleStatus;
}

export class KeyResultDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MaxLength(200) title: string;
  @IsNumber() @Min(0) target: number;
  @IsNumber() @Min(0) current: number;
  @IsString() @MaxLength(20) unit: string;
}

export class CreateGoalDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(GoalCategory) category?: GoalCategory;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() cycleId?: string;
  @IsOptional() @IsUUID() parentGoalId?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) weight?: number;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => KeyResultDto) keyResults: KeyResultDto[];
}

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsOptional() @IsEnum(GoalStatus) status?: GoalStatus;
}

export class GoalQueryDto {
  @IsOptional() @IsIn(['me', 'team', 'all', 'company']) scope: 'me' | 'team' | 'all' | 'company' = 'me';
  @IsOptional() @IsUUID() cycleId?: string;
  @IsOptional() @IsUUID() employeeId?: string;
}

export class CompetencyInputDto {
  @IsString() name: string;
  @IsInt() @Min(1) @Max(5) rating: number;
}

export class SelfReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @MinLength(20) comments: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CompetencyInputDto) competencies: CompetencyInputDto[];
}

export class ManagerReviewDto extends SelfReviewDto {
  @IsOptional() @IsString() strengths?: string;
  @IsOptional() @IsString() improvements?: string;
}

export class CalibrateDto {
  @IsNumber() @Min(1) @Max(5) finalRating: number;
}

export class ReviewQueryDto {
  @IsOptional() @IsIn(['me', 'team', 'all']) scope: 'me' | 'team' | 'all' = 'me';
  @IsOptional() @IsUUID() cycleId?: string;
}

export class GiveFeedbackDto {
  @IsUUID() toId: string;
  @IsString() @MinLength(5) @MaxLength(2000) message: string;
  @IsOptional() @IsEnum(FeedbackType) type?: FeedbackType;
  @IsOptional() @IsEnum(FeedbackVisibility) visibility?: FeedbackVisibility;
}
