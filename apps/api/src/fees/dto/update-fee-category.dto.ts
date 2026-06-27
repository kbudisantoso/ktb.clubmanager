import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BillingInterval, FeeCategoryScope } from '../../../../../prisma/generated/client/index.js';

export class UpdateFeeCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name (e.g., "Aufnahmegebühr", "Tennisabteilung")',
    example: 'Aufnahmegebühr',
  })
  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Name darf nicht leer sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Fee amount as decimal string (e.g., "120.00")',
    example: '120.00',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(',', '.') : value))
  @Matches(/^\d{1,8}([.,]\d{1,2})?$/, {
    message: 'Betrag muss ein gültiges Dezimalformat haben (z.B. „120.00", max 8 Vorkommastellen)',
  })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Billing frequency',
    enum: BillingInterval,
  })
  @IsEnum(BillingInterval, { message: 'Ungültiger Abrechnungszeitraum' })
  @IsOptional()
  billingInterval?: BillingInterval;

  @ApiPropertyOptional({
    description: 'Whether this is a one-time fee',
  })
  @IsBoolean()
  @IsOptional()
  isOneTime?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether the fee is pro-rated for mid-period joins (only when the club uses MONTHLY_PRO_RATA)',
  })
  @IsBoolean()
  @IsOptional()
  proRataEligible?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this category is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Display order in lists',
    minimum: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0, { message: 'Sortierung muss mindestens 0 sein' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Scope: which members this category applies to',
    enum: FeeCategoryScope,
  })
  @IsEnum(FeeCategoryScope, { message: 'Ungültiger Geltungsbereich' })
  @IsOptional()
  scope?: FeeCategoryScope;

  @ApiPropertyOptional({
    description: 'Membership type IDs (for BY_MEMBERSHIP_TYPE scope)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  membershipTypeIds?: string[];
}
