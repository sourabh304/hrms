import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export type Scope = 'me' | 'team' | 'all';

export class ScopedQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['me', 'team', 'all'])
  scope: Scope = 'me';

  @IsOptional()
  @IsString()
  status?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function paginated<T>(data: T[], total: number, query: PaginationQueryDto): Paginated<T> {
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export const skipOf = (q: PaginationQueryDto) => (q.page - 1) * q.limit;
