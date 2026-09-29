import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Role } from '../../../common/auth/roles.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ApproverType, RequestStatus, WorkflowType } from '../workflow.types.js';
import type { PolicyCondition } from '../workflow.types.js';

export class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class BulkDecisionDto extends DecisionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  requestIds: string[];

  @IsIn(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';
}

export class InboxQueryDto {
  @IsOptional()
  @IsEnum(WorkflowType)
  type?: WorkflowType;
}

export class RequestQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['mine', 'all'])
  scope: 'mine' | 'all' = 'mine';

  @IsOptional()
  @IsEnum(WorkflowType)
  type?: WorkflowType;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

export class PolicyStepDto {
  @IsString()
  @MaxLength(120)
  label: string;

  @IsEnum(ApproverType)
  approverType: ApproverType;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  condition?: PolicyCondition;
}

export class UpdatePolicyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyStepDto)
  steps?: PolicyStepDto[];
}
