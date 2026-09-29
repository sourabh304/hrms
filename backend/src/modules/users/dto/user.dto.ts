import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../../common/auth/roles.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class UserQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles: Role[];
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}
