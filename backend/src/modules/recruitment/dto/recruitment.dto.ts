import { OmitType, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { EmploymentType, WorkMode } from '../../employees/entities/employee.entity.js';
import { CandidateSource } from '../entities/candidate.entity.js';
import { InterviewMode, InterviewStatus, Recommendation } from '../entities/interview.entity.js';
import { ApplicationStage } from '../entities/job-application.entity.js';
import { JobStatus } from '../entities/job-opening.entity.js';

export class CreateJobDto {
  @IsString() @MaxLength(160) title: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsInt() @Min(1) openings?: number;
  @IsString() @MinLength(20) description: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsInt() @Min(0) experienceMin?: number;
  @IsOptional() @IsInt() @Min(0) experienceMax?: number;
  @IsOptional() @IsNumber() @Min(0) salaryMin?: number;
  @IsOptional() @IsNumber() @Min(0) salaryMax?: number;
  @IsOptional() @IsUUID() hiringManagerId?: string;
  @IsOptional() @IsUUID() recruiterId?: string;
  @IsOptional() @IsDateString() closingDate?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  /** Route through the job requisition approval process immediately. */
  @IsOptional() @IsBoolean() submitForApproval?: boolean;
}

export class UpdateJobDto extends PartialType(OmitType(CreateJobDto, ['submitForApproval'] as const)) {}

export class JobStatusDto {
  @IsIn([JobStatus.OPEN, JobStatus.ON_HOLD, JobStatus.CLOSED, JobStatus.CANCELLED])
  status: JobStatus;
}

export class JobQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
  @IsOptional() @IsUUID() departmentId?: string;
  /** `board` = internal job board (open roles, any employee). */
  @IsOptional() @IsIn(['manage', 'board']) view: 'manage' | 'board' = 'manage';
}

export class CreateCandidateDto {
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() currentCompany?: string;
  @IsOptional() @IsString() currentTitle?: string;
  @IsOptional() @IsNumber() @Min(0) experienceYears?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(CandidateSource) source?: CandidateSource;
  @IsOptional() @IsUrl() resumeUrl?: string;
  @IsOptional() @IsUrl() linkedinUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsString() notes?: string;
  /** Optionally attach straight to a job. */
  @IsOptional() @IsUUID() jobId?: string;
}

export class UpdateCandidateDto extends PartialType(OmitType(CreateCandidateDto, ['jobId'] as const)) {}

export class CandidateQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(CandidateSource) source?: CandidateSource;
}

export class CreateApplicationDto {
  @IsUUID() jobId: string;
  @IsUUID() candidateId: string;
  @IsOptional() @IsString() notes?: string;
}

export class MoveStageDto {
  @IsEnum(ApplicationStage) stage: ApplicationStage;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() @MaxLength(300) rejectionReason?: string;
  @IsOptional() @IsNumber() @Min(0) offeredSalary?: number;
}

export class RateApplicationDto {
  @IsInt() @Min(1) @Max(5) rating: number;
}

export class ApplicationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() jobId?: string;
  @IsOptional() @IsEnum(ApplicationStage) stage?: ApplicationStage;
}

export class HireDto {
  @IsDateString() dateOfJoining: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsEmail() workEmail?: string;
  @IsOptional() @IsBoolean() createUserAccount?: boolean;
}

export class ScheduleInterviewDto {
  @IsUUID() interviewerId: string;
  @IsString() @MaxLength(80) round: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsInt() @Min(15) durationMinutes?: number;
  @IsOptional() @IsEnum(InterviewMode) mode?: InterviewMode;
  @IsOptional() @IsUrl() meetingLink?: string;
}

export class InterviewFeedbackDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsEnum(Recommendation) recommendation: Recommendation;
  @IsString() @MinLength(10) feedback: string;
}

export class UpdateInterviewDto {
  @IsOptional() @IsEnum(InterviewStatus) status?: InterviewStatus;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class ReferralDto {
  @IsUUID() jobId: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsUrl() linkedinUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class PublicApplyDto {
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsUrl() resumeUrl?: string;
  @IsOptional() @IsUrl() linkedinUrl?: string;
  @IsOptional() @IsNumber() @Min(0) experienceYears?: number;
  @IsOptional() @IsString() @MaxLength(3000) coverLetter?: string;
}
