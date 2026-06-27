import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateFeeCategoryDto {
  @ApiProperty({
    description: 'Category name (e.g., "Aufnahmegebühr", "Tennisabteilung")',
    example: 'Aufnahmegebühr',
  })
  @IsString()
  @MinLength(1, { message: 'Name darf nicht leer sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description',
    example: 'Einmalige Aufnahmegebühr für neue Mitglieder',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  description?: string;

  @ApiProperty({
    description: 'Fee amount as decimal string (e.g., "120.00")',
    example: '120.00',
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(',', '.') : value))
  @Matches(/^\d{1,8}([.,]\d{1,2})?$/, {
    message: 'Betrag muss ein gültiges Dezimalformat haben (z.B. „120.00", max 8 Vorkommastellen)',
  })
  amount!: string;

  @ApiPropertyOptional({
    description: 'Billing frequency',
    enum: BillingInterval,
    default: 'ANNUALLY',
  })
  @IsEnum(BillingInterval, { message: 'Ungültiger Abrechnungszeitraum' })
  @IsOptional()
  billingInterval?: BillingInterval;

  @ApiPropertyOptional({
    description: 'Whether this is a one-time fee (e.g., enrollment fee)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isOneTime?: boolean;

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
    description: 'Scope: which members this category applies to',
    enum: FeeCategoryScope,
    default: 'ALL_MEMBERS',
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
