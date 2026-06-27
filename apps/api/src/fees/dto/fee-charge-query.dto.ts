import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class FeeChargeQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by derived payment status',
    enum: ['OPEN', 'PARTIAL', 'PAID', 'OVERDUE'],
  })
  @IsOptional()
  @IsIn(['OPEN', 'PARTIAL', 'PAID', 'OVERDUE'], {
    message: 'Status muss OPEN, PARTIAL, PAID oder OVERDUE sein',
  })
  status?: 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

  @ApiPropertyOptional({
    description: 'Filter by specific member ID',
  })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({
    description: 'Filter by period start (inclusive)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Periodenbeginn muss ein gültiges Datum sein' })
  periodStart?: string;

  @ApiPropertyOptional({
    description: 'Filter by period end (inclusive)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Periodenende muss ein gültiges Datum sein' })
  periodEnd?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (max 100)',
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
