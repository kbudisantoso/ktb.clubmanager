import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreatePeriodDto {
  @ApiProperty({
    description: 'Join date (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  joinDate!: string;

  @ApiPropertyOptional({
    description: 'Leave date (YYYY-MM-DD), null for current period',
    example: '2025-12-31',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  leaveDate?: string;

  @ApiPropertyOptional({
    description: 'Membership type ID (FK to MembershipType entity)',
    example: 'clxyz...',
  })
  @IsString()
  @IsOptional()
  membershipTypeId?: string;

  @ApiPropertyOptional({
    description: 'Optional notes about this period',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdatePeriodDto {
  @ApiPropertyOptional({
    description: 'Join date (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  joinDate?: string;

  @ApiPropertyOptional({
    description: 'Leave date (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  leaveDate?: string;

  @ApiPropertyOptional({
    description: 'Membership type ID (FK to MembershipType entity)',
    example: 'clxyz...',
  })
  @IsString()
  @IsOptional()
  membershipTypeId?: string;

  @ApiPropertyOptional({ description: 'Notes about this period' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class ClosePeriodDto {
  @ApiProperty({
    description: 'Leave date (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  leaveDate!: string;
}
