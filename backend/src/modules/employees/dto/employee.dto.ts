import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Role } from '../../../common/auth/roles.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { EmployeeStatus, EmploymentType, Gender, WorkMode } from '../entities/employee.entity.js';

export class AddressDto {
  @IsOptional() @IsString() line1?: string;
  @IsOptional() @IsString() line2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() postalCode?: string;
}

export class EmergencyContactDto {
  @IsString() name: string;
  @IsString() relationship: string;
  @IsString() phone: string;
}

export class BankDetailsDto {
  @IsString() bankName: string;
  @IsString() accountHolder: string;
  @IsString() accountNumber: string;
  @IsOptional() @IsString() routingCode?: string;
}

export class CreateEmployeeDto {
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsOptional() @IsString() @MaxLength(80) preferredName?: string;
  @IsEmail() workEmail: string;
  @IsOptional() @IsEmail() personalEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() @MaxLength(5) bloodGroup?: string;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;
  @IsOptional() @ValidateNested() @Type(() => EmergencyContactDto) emergencyContact?: EmergencyContactDto;
  @IsOptional() @ValidateNested() @Type(() => BankDetailsDto) bankDetails?: BankDetailsDto;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];

  @IsOptional() @IsUUID() departmentId?: string | null;
  @IsOptional() @IsUUID() designationId?: string | null;
  @IsOptional() @IsUUID() locationId?: string | null;
  @IsOptional() @IsUUID() managerId?: string | null;
  @IsOptional() @IsUUID() shiftId?: string | null;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsDateString() dateOfJoining: string;
  @IsOptional() @IsDateString() probationEndDate?: string;

  /** Provision a login for this employee. */
  @IsOptional() @IsBoolean() createUserAccount?: boolean;
  @IsOptional() @IsArray() @IsEnum(Role, { each: true }) roles?: Role[];
  @IsOptional() @IsString() @MinLength(8) initialPassword?: string;
}

export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['createUserAccount', 'roles', 'initialPassword'] as const),
) {
  @IsOptional() @IsDateString() dateOfExit?: string | null;
  @IsOptional() @IsString() @MaxLength(300) changeNote?: string;
}

/** Fields an employee may edit about themselves (self-service). */
export class UpdateMyProfileDto {
  @IsOptional() @IsString() @MaxLength(80) preferredName?: string;
  @IsOptional() @IsEmail() personalEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() @MaxLength(5) bloodGroup?: string;
  @IsOptional() @ValidateNested() @Type(() => AddressDto) address?: AddressDto;
  @IsOptional() @ValidateNested() @Type(() => EmergencyContactDto) emergencyContact?: EmergencyContactDto;
  @IsOptional() @ValidateNested() @Type(() => BankDetailsDto) bankDetails?: BankDetailsDto;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsUrl() avatarUrl?: string;
}

export class EmployeeQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeExited?: boolean;

  @IsOptional()
  @IsIn(['name', 'joined', 'code'])
  sort?: 'name' | 'joined' | 'code';
}
