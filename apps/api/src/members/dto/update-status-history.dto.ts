import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength, Matches } from 'class-validator';
import { LeftCategoryDto } from './create-member.dto.js';

export class UpdateStatusHistoryDto {
  @ApiPropertyOptional({
    description: 'Updated reason for the status change',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Begruendung darf maximal 500 Zeichen lang sein' })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Updated effective date (YYYY-MM-DD)',
    example: '2025-06-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: 'Updated left category (only for LEFT transitions)',
    enum: LeftCategoryDto,
  })
  @IsOptional()
  @IsEnum(LeftCategoryDto)
  leftCategory?: LeftCategoryDto;
}
