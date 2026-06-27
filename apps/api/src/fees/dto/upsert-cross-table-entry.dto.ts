import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { BillingInterval } from '../../../../../prisma/generated/client/index.js';

export class UpsertCrossTableEntryDto {
  @ApiProperty({
    description: 'Reference to the membership type',
    example: 'clxyz123abc',
  })
  @IsString()
  membershipTypeId!: string;

  @ApiProperty({
    description: 'Reference to the fee type',
    example: 'clxyz456def',
  })
  @IsString()
  feeTypeId!: string;

  @ApiProperty({
    description: 'Fee amount as decimal string (e.g., "65.00" or "65,00")',
    example: '65.00',
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(',', '.') : value))
  @Matches(/^\d+([.,]\d{1,2})?$/, {
    message: 'Bitte gib einen gueltigen Betrag ein (z.B. 65.00)',
  })
  amount!: string;

  @ApiPropertyOptional({
    description: 'Billing frequency for this combination',
    enum: BillingInterval,
    default: 'ANNUALLY',
  })
  @IsEnum(BillingInterval, { message: 'Ungueltiger Abrechnungszeitraum' })
  @IsOptional()
  billingInterval?: BillingInterval;
}
