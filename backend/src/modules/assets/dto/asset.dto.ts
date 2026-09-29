import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { AssetCategory, AssetCondition, AssetStatus } from '../entities/asset.entity.js';

export class CreateAssetDto {
  @IsString() @MaxLength(30) assetTag: string;
  @IsString() @MaxLength(160) name: string;
  @IsEnum(AssetCategory) category: AssetCategory;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() @Min(0) purchaseCost?: number;
  @IsOptional() @IsDateString() warrantyUntil?: string;
  @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
}

export class AssetQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsEnum(AssetCategory) category?: AssetCategory;
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class AssignAssetDto {
  @IsUUID() employeeId: string;
  @IsOptional() @IsString() notes?: string;
}

export class ReturnAssetDto {
  @IsEnum(AssetCondition) condition: AssetCondition;
  @IsOptional() @IsString() notes?: string;
}
