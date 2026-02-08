import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
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
    description: 'Filter by member status',
    enum: MemberStatusDto,
  })
  @IsEnum(MemberStatusDto)
  @IsOptional()
  status?: MemberStatusDto;

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
