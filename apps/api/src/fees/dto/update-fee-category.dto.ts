import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { BillingInterval } from '../../../../../prisma/generated/client/index.js';

export class UpdateFeeCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name (e.g., "Aufnahmegebuehr", "Tennisabteilung")',
    example: 'Aufnahmegebuehr',
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
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'Betrag muss ein gueltiges Dezimalformat haben (z.B. "120.00")',
  })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Billing frequency',
    enum: BillingInterval,
  })
  @IsEnum(BillingInterval, { message: 'Ungueltiger Abrechnungszeitraum' })
  @IsOptional()
  billingInterval?: BillingInterval;

  @ApiPropertyOptional({
    description: 'Whether this is a one-time fee',
  })
  @IsBoolean()
  @IsOptional()
  isOneTime?: boolean;

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
}
