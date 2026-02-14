import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum PersonTypeDto {
  NATURAL = 'NATURAL',
  LEGAL_ENTITY = 'LEGAL_ENTITY',
}

export enum SalutationDto {
  HERR = 'HERR',
  FRAU = 'FRAU',
  DIVERS = 'DIVERS',
}

export enum MemberStatusDto {
  PENDING = 'PENDING',
  PROBATION = 'PROBATION',
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  SUSPENDED = 'SUSPENDED',
  LEFT = 'LEFT',
}

export enum LeftCategoryDto {
  VOLUNTARY = 'VOLUNTARY',
  EXCLUSION = 'EXCLUSION',
  DEATH = 'DEATH',
  OTHER = 'OTHER',
}

export class CreateMemberDto {
  @ApiPropertyOptional({
    description: 'Person type (natural person or legal entity)',
    enum: PersonTypeDto,
    default: PersonTypeDto.NATURAL,
  })
  @IsEnum(PersonTypeDto)
  @IsOptional()
  personType?: PersonTypeDto;

  @ApiPropertyOptional({
    description: 'Salutation (Anrede)',
    enum: SalutationDto,
  })
  @IsEnum(SalutationDto)
  @IsOptional()
  salutation?: SalutationDto;

  @ApiPropertyOptional({
    description: 'Academic or professional title (e.g., Dr., Prof. Dr.)',
    example: 'Dr.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @ApiProperty({
    description: 'First name (Vorname)',
    example: 'Max',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Vorname muss mindestens 1 Zeichen lang sein' })
  @MaxLength(100, { message: 'Vorname darf maximal 100 Zeichen lang sein' })
  firstName!: string;

  @ApiProperty({
    description: 'Last name (Nachname)',
    example: 'Mustermann',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Nachname muss mindestens 1 Zeichen lang sein' })
  @MaxLength(100, { message: 'Nachname darf maximal 100 Zeichen lang sein' })
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Nickname or club name (Spitzname)',
    example: 'Maxi',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nickname?: string;

  // --- Legal entity fields ---

  @ApiPropertyOptional({
    description: 'Organization name (required for LEGAL_ENTITY)',
    example: 'Mustermann GmbH',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  organizationName?: string;

  @ApiPropertyOptional({ description: 'Contact person first name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactFirstName?: string;

  @ApiPropertyOptional({ description: 'Contact person last name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactLastName?: string;

  @ApiPropertyOptional({ description: 'Department within the organization' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Position/role within the organization' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ description: 'VAT ID / Steuernummer' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  vatId?: string;

  // --- Address (structured for SEPA) ---

  @ApiPropertyOptional({ description: 'Street name (Strasse)', example: 'Musterstrasse' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({ description: 'House number (e.g., "42a", "7-9")', example: '42a' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  houseNumber?: string;

  @ApiPropertyOptional({ description: 'Address supplement (c/o, Apartment, Hinterhaus)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  addressExtra?: string;

  // Germany-only PLZ format (5 digits). International postal codes deferred.
  @ApiPropertyOptional({
    description: 'Postal code (PLZ, 5-digit German format)',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{5}$/, { message: 'PLZ muss genau 5 Ziffern haben' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City (Ort)', example: 'Musterstadt' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country (ISO 3166-1 alpha-2)',
    example: 'DE',
    default: 'DE',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  country?: string;

  // --- Contact ---

  @ApiPropertyOptional({ description: 'Email for club communication', example: 'max@example.com' })
  @IsEmail({}, { message: 'Ungueltige E-Mail-Adresse' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+49 30 12345678' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile phone number', example: '+49 170 12345678' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  mobile?: string;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  notes?: string;

  // --- Membership ---

  @ApiPropertyOptional({
    description: 'Member number (auto-generated if not provided)',
    example: 'M-0001',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  memberNumber?: string;

  @ApiPropertyOptional({
    description: 'Member status',
    enum: MemberStatusDto,
    default: MemberStatusDto.PENDING,
  })
  @IsEnum(MemberStatusDto)
  @IsOptional()
  status?: MemberStatusDto;

  @ApiPropertyOptional({
    description: 'Entry date (YYYY-MM-DD format)',
    example: '2025-01-15',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Datum muss im Format YYYY-MM-DD sein' })
  joinDate?: string;

  @ApiPropertyOptional({
    description: 'Membership type ID (FK to MembershipType entity) for initial period',
    example: 'clxyz...',
  })
  @IsString()
  @IsOptional()
  membershipTypeId?: string;
}
