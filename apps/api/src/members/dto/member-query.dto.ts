import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MemberStatusDto } from './create-member.dto.js';

export enum MemberSortBy {
  LAST_NAME = 'lastName',
  FIRST_NAME = 'firstName',
  MEMBER_NUMBER = 'memberNumber',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class MemberQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (searches name, member number, email)',
    example: 'Mustermann',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Suchbegriff muss mindestens 2 Zeichen lang sein' })
  @MaxLength(100, { message: 'Suchbegriff darf maximal 100 Zeichen lang sein' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (member ID)',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page (1-100)',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by member status (comma-separated for multi-select)',
    example: 'ACTIVE,PENDING',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return typeof value === 'string' ? value.split(',') : [value];
  })
  @IsArray()
  @IsEnum(MemberStatusDto, { each: true })
  status?: MemberStatusDto[];

  @ApiPropertyOptional({
    description:
      'Filter by household: HAS (has any household), NONE (no household), or comma-separated household IDs',
    example: 'HAS',
  })
  @IsString()
  @IsOptional()
  householdFilter?: string;

  @ApiPropertyOptional({
    description:
      'Filter by membership period year — returns members who had an active membership period overlapping this year',
    example: '2025',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1900)
  @Max(2100)
  periodYear?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: MemberSortBy,
    default: MemberSortBy.LAST_NAME,
  })
  @IsEnum(MemberSortBy)
  @IsOptional()
  sortBy?: MemberSortBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
