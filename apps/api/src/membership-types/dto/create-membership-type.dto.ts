import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { MEMBER_TYPE_COLORS } from '@ktb/shared';
import { BillingInterval } from '../../../../../prisma/generated/client/index.js';

export class CreateMembershipTypeDto {
  @ApiProperty({
    description: 'Display name (e.g., "Ordentliches Mitglied")',
    example: 'Ordentliches Mitglied',
  })
  @IsString()
  @MinLength(1, { message: 'Name darf nicht leer sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name!: string;

  @ApiProperty({
    description: 'Short code (e.g., "ORDENTLICH") - unique per club, uppercase with underscores',
    example: 'ORDENTLICH',
  })
  @IsString()
  @MinLength(1, { message: 'Code darf nicht leer sein' })
  @MaxLength(20, { message: 'Code darf maximal 20 Zeichen lang sein' })
  @Matches(/^[A-Z_]+$/, { message: 'Code darf nur Grossbuchstaben und Unterstriche enthalten' })
  code!: string;

  @ApiPropertyOptional({
    description: 'Optional longer description',
    example: 'Vollmitglied mit allen Rechten und Pflichten',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default type for new members',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Display order in lists',
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0, { message: 'Sortierung muss mindestens 0 sein' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this type is currently available for selection',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether members of this type have voting rights (Stimmrecht)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  vote?: boolean;

  @ApiPropertyOptional({
    description: 'Whether members can attend general assembly (Versammlungsteilnahme)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  assemblyAttendance?: boolean;

  @ApiPropertyOptional({
    description: 'Whether members are eligible for board positions (Wahlfaehigkeit)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  eligibleForOffice?: boolean;

  @ApiPropertyOptional({
    description: 'Badge color for UI display',
    enum: MEMBER_TYPE_COLORS,
    default: 'BLUE',
  })
  @IsString()
  @IsOptional()
  @IsIn([...MEMBER_TYPE_COLORS], { message: 'Ungueltige Farbe' })
  color?: string;

  @ApiPropertyOptional({
    description: 'Base fee amount as decimal string (e.g., "120.00")',
    example: '120.00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Betrag muss ein gueltiges Dezimalformat haben (z.B. "120.00")',
  })
  feeAmount?: string;

  @ApiPropertyOptional({
    description: 'Billing frequency for base fee',
    enum: BillingInterval,
  })
  @IsEnum(BillingInterval, { message: 'Ungueltiger Abrechnungszeitraum' })
  @IsOptional()
  billingInterval?: BillingInterval;
}
