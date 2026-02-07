import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';

export enum ClubVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export class CreateClubDto {
  @ApiProperty({
    description: 'Club display name',
    example: 'TSV Musterstadt 1920',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-safe slug (auto-generated if not provided)',
    example: 'tsv-musterstadt-1920',
  })
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Slug must be at least 3 characters' })
  @MaxLength(50, { message: 'Slug must not exceed 50 characters' })
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Legal/official club name',
    example: 'Turn- und Sportverein Musterstadt 1920 e.V.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'Club description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Club visibility',
    enum: ClubVisibility,
    default: ClubVisibility.PRIVATE,
  })
  @IsEnum(ClubVisibility)
  @IsOptional()
  visibility?: ClubVisibility;

  @ApiPropertyOptional({ description: 'Tier ID to assign (Super Admin only)' })
  @IsString()
  @IsOptional()
  tierId?: string;

  @ApiPropertyOptional({
    description: 'Avatar initials (1-3 chars)',
    example: 'TSV',
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(3)
  avatarInitials?: string;

  @ApiPropertyOptional({
    description: 'Avatar color from preset palette',
    example: 'blue',
  })
  @IsString()
  @IsOptional()
  avatarColor?: string;
}
