import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsEmail,
  IsUrl,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum ClubVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum ClubPurpose {
  IDEALVEREIN = 'IDEALVEREIN',
  WIRTSCHAFTLICH = 'WIRTSCHAFTLICH',
}

export enum ClubSpecialForm {
  KEINE = 'KEINE',
  TRAEGERVEREIN = 'TRAEGERVEREIN',
  FOERDERVEREIN = 'FOERDERVEREIN',
  DACHVERBAND = 'DACHVERBAND',
}

export enum MembershipType {
  ORDENTLICH = 'ORDENTLICH',
  PASSIV = 'PASSIV',
  EHREN = 'EHREN',
  FOERDER = 'FOERDER',
  JUGEND = 'JUGEND',
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
    description: 'Avatar color from preset palette',
    example: 'blue',
  })
  @IsString()
  @IsOptional()
  avatarColor?: string;

  // --- Stammdaten (Basic Data) ---

  @ApiPropertyOptional({
    description: 'Club abbreviation / short code (2–4 characters, used for avatar)',
    example: 'TSV',
    minLength: 2,
    maxLength: 4,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(4)
  shortCode?: string;

  @ApiPropertyOptional({
    description: 'Club founding date (YYYY-MM-DD)',
    example: '1920-06-15',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'foundedAt must be in YYYY-MM-DD format',
  })
  foundedAt?: string;

  // --- Adresse & Kontakt (Address & Contact) ---

  @ApiPropertyOptional({ description: 'Street name', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({ description: 'House number', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  houseNumber?: string;

  @ApiPropertyOptional({ description: 'Postal code', maxLength: 10 })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact email', example: 'info@tsv-musterstadt.de' })
  @IsString()
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://www.tsv-musterstadt.de',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  @MaxLength(500)
  website?: string;

  // --- Vereinsregister (Club Registry) ---

  @ApiPropertyOptional({ description: 'Whether the club is a registered association (e.V.)' })
  @IsBoolean()
  @IsOptional()
  isRegistered?: boolean;

  @ApiPropertyOptional({ description: 'Registry court (Amtsgericht)', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  registryCourt?: string;

  @ApiPropertyOptional({ description: 'Registry number (VR-Nummer)', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  registryNumber?: string;

  @ApiPropertyOptional({
    description: 'Club purpose classification',
    enum: ClubPurpose,
  })
  @IsEnum(ClubPurpose)
  @IsOptional()
  clubPurpose?: ClubPurpose;

  @ApiPropertyOptional({
    description: 'Special organizational form',
    enum: ClubSpecialForm,
  })
  @IsEnum(ClubSpecialForm)
  @IsOptional()
  clubSpecialForm?: ClubSpecialForm;

  // --- Steuerdaten (Tax Data) ---

  @ApiPropertyOptional({ description: 'Tax number (Steuernummer)', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxNumber?: string;

  @ApiPropertyOptional({ description: 'VAT identification number (USt-IdNr)', maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  vatId?: string;

  @ApiPropertyOptional({
    description: 'Responsible tax office (Finanzamt)',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  taxOffice?: string;

  @ApiPropertyOptional({ description: 'Non-profit status (Gemeinnuetzigkeit)' })
  @IsBoolean()
  @IsOptional()
  isNonProfit?: boolean;

  // --- Bankverbindung (Bank Details) ---

  @ApiPropertyOptional({ description: 'IBAN', maxLength: 34 })
  @IsString()
  @IsOptional()
  @MaxLength(34)
  iban?: string;

  @ApiPropertyOptional({ description: 'BIC / SWIFT code', maxLength: 11 })
  @IsString()
  @IsOptional()
  @MaxLength(11)
  bic?: string;

  @ApiPropertyOptional({ description: 'Bank name', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Account holder name', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  accountHolder?: string;

  // --- Betriebseinstellungen (Operational Settings) ---

  @ApiPropertyOptional({
    description: 'Fiscal year start month (1=January, 12=December)',
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @ApiPropertyOptional({
    description: 'Default membership type for new members',
    enum: MembershipType,
  })
  @IsEnum(MembershipType)
  @IsOptional()
  defaultMembershipType?: MembershipType;

  @ApiPropertyOptional({
    description: 'Probation period in days for new members',
    minimum: 0,
    maximum: 365,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(365)
  probationPeriodDays?: number;

  // --- Logo ---

  @ApiPropertyOptional({ description: 'Reference to uploaded logo file ID' })
  @IsString()
  @IsOptional()
  logoFileId?: string;
}
