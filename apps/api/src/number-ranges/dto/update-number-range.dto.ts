import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, MaxLength } from 'class-validator';

export class UpdateNumberRangeDto {
  @ApiPropertyOptional({
    description: 'Prefix for generated numbers. May contain {YYYY} placeholder for current year.',
    example: 'TSV-{YYYY}-',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Prefix must not exceed 50 characters' })
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Number of digits to zero-pad (e.g., 4 produces "0001")',
    example: 4,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Pad length must be at least 1' })
  @Max(10, { message: 'Pad length must not exceed 10' })
  padLength?: number;

  @ApiPropertyOptional({
    description: 'Whether to reset counter at year boundary',
  })
  @IsBoolean()
  @IsOptional()
  yearReset?: boolean;
}
