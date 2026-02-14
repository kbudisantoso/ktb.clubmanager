import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateMembershipTypeDto {
  @ApiPropertyOptional({
    description: 'Display name (e.g., "Ordentliches Mitglied")',
    example: 'Ordentliches Mitglied',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Name darf nicht leer sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Short code (e.g., "ORDENTLICH") - unique per club, uppercase with underscores',
    example: 'ORDENTLICH',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Code darf nicht leer sein' })
  @MaxLength(20, { message: 'Code darf maximal 20 Zeichen lang sein' })
  @Matches(/^[A-Z_]+$/, { message: 'Code darf nur Grossbuchstaben und Unterstriche enthalten' })
  code?: string;

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
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Display order in lists',
    minimum: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0, { message: 'Sortierung muss mindestens 0 sein' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this type is currently available for selection',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether members of this type have voting rights (Stimmrecht)',
  })
  @IsBoolean()
  @IsOptional()
  vote?: boolean;

  @ApiPropertyOptional({
    description: 'Whether members can attend general assembly (Versammlungsteilnahme)',
  })
  @IsBoolean()
  @IsOptional()
  assemblyAttendance?: boolean;

  @ApiPropertyOptional({
    description: 'Whether members are eligible for board positions (Wahlfaehigkeit)',
  })
  @IsBoolean()
  @IsOptional()
  eligibleForOffice?: boolean;
}
