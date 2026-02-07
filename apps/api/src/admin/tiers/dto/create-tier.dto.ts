import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsInt, IsOptional, Min, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for creating a new tier.
 *
 * Tiers define feature limits and flags for clubs.
 * Used by Super Admin via the Kommandozentrale.
 */
export class CreateTierDto {
  @ApiProperty({
    description: 'Tier display name',
    example: 'Premium',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({
    description: 'Beschreibung der Funktionen in diesem Tier',
    example: 'Volle Funktionalität für mittlere Vereine',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'In Tier-Auswahl anzeigen',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: 'Sortierreihenfolge in Listen', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Preset-Farbname für Anzeige' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Lucide Icon-Name' })
  @IsString()
  @IsOptional()
  icon?: string;

  // Limits (null = unlimited)
  @ApiPropertyOptional({
    description: 'Max. Benutzer pro Verein (null = unbegrenzt)',
    example: 10,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  usersLimit?: number;

  @ApiPropertyOptional({
    description: 'Max. Mitglieder pro Verein (null = unbegrenzt)',
    example: 500,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  membersLimit?: number;

  @ApiPropertyOptional({
    description: 'Speicherlimit in MB (null = unbegrenzt)',
    example: 1000,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  storageLimit?: number;

  // Feature flags
  @ApiPropertyOptional({ description: 'SEPA-Lastschrift aktiviert', default: true })
  @IsBoolean()
  @IsOptional()
  sepaEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Berichte-Funktion aktiviert', default: true })
  @IsBoolean()
  @IsOptional()
  reportsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Bankimport-Funktion aktiviert', default: true })
  @IsBoolean()
  @IsOptional()
  bankImportEnabled?: boolean;
}
