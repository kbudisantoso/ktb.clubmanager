import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum } from 'class-validator';
import { BillingInterval } from '../../../../../prisma/generated/client/index.js';

export class BillingRunPreviewDto {
  @ApiProperty({
    description: 'Start of the billing period (ISO date string)',
    example: '2026-01-01',
  })
  @IsDateString({}, { message: 'Periodenbeginn muss ein gültiges Datum sein' })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the billing period (ISO date string)',
    example: '2026-12-31',
  })
  @IsDateString({}, { message: 'Periodenende muss ein gültiges Datum sein' })
  periodEnd!: string;

  @ApiProperty({
    description: 'Billing interval to generate charges for',
    enum: BillingInterval,
  })
  @IsEnum(BillingInterval, { message: 'Ungültiger Abrechnungszeitraum' })
  billingInterval!: BillingInterval;
}
