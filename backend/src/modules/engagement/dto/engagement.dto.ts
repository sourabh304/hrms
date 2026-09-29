import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { KudosBadge } from '../entities/kudos.entity.js';
import { SurveyStatus } from '../entities/survey.entity.js';
import type { QuestionType } from '../entities/survey.entity.js';

export class GiveKudosDto {
  @IsUUID() toId: string;
  @IsEnum(KudosBadge) badge: KudosBadge;
  @IsString() @MinLength(5) @MaxLength(1000) message: string;
}

export class SurveyQuestionDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MaxLength(300) text: string;
  @IsIn(['RATING', 'ENPS', 'TEXT', 'CHOICE']) type: QuestionType;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsOptional() @IsBoolean() required?: boolean;
}

export class CreateSurveyDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SurveyQuestionDto) questions: SurveyQuestionDto[];
  @IsOptional() @IsBoolean() isAnonymous?: boolean;
  @IsOptional() @IsDateString() closesOn?: string;
}

export class SurveyStatusDto {
  @IsEnum(SurveyStatus) status: SurveyStatus;
}

export class SurveyAnswerDto {
  @IsObject() answers: Record<string, string | number>;
}
