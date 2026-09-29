import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { TicketCategory, TicketPriority, TicketStatus } from '../entities/ticket.entity.js';

export class CreateTicketDto {
  @IsString() @MinLength(5) @MaxLength(200) subject: string;
  @IsString() @MinLength(10) description: string;
  @IsEnum(TicketCategory) category: TicketCategory;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
}

export class UpdateTicketDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsUUID() assigneeId?: string | null;
  @IsOptional() @IsEnum(TicketCategory) category?: TicketCategory;
}

export class CommentDto {
  @IsString() @MinLength(1) @MaxLength(5000) message: string;
  @IsOptional() @IsBoolean() isInternal?: boolean;
}

export class RateTicketDto {
  @IsInt() @Min(1) @Max(5) satisfaction: number;
}

export class TicketQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['me', 'assigned', 'all']) scope: 'me' | 'assigned' | 'all' = 'me';
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketCategory) category?: TicketCategory;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
}
