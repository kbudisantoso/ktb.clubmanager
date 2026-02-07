import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateNumberRangeDto {
  @ApiProperty({
    description: 'Entity type this range is for (e.g., MEMBER, TRANSACTION, SEPA_MANDATE)',
    example: 'MEMBER',
  })
  @IsString()
  @MinLength(1, { message: 'Entity type must not be empty' })
  @MaxLength(50, { message: 'Entity type must not exceed 50 characters' })
  entityType!: string;

  @ApiPropertyOptional({
    description: 'Prefix for generated numbers. May contain {YYYY} placeholder for current year.',
    example: 'M-',
    default: '',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Prefix must not exceed 50 characters' })
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Number of digits to zero-pad (e.g., 4 produces "0001")',
    example: 4,
    default: 4,
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
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  yearReset?: boolean;
}
