import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty({
    description: 'The fee charge this payment is for',
    example: 'clxyz123...',
  })
  @IsString()
  feeChargeId!: string;

  @ApiProperty({
    description: 'Payment amount as decimal string (e.g., "50.00")',
    example: '50.00',
  })
  @IsString()
  @Matches(/^(?!0+(\.0{1,2})?$)\d{1,8}(\.\d{1,2})?$/, {
    message: 'Betrag muss groesser als 0 sein und ein gueltiges Dezimalformat haben (z.B. "50.00")',
  })
  amount!: string;

  @ApiProperty({
    description: 'Date the payment was made (ISO date string)',
    example: '2026-01-20',
  })
  @IsDateString({}, { message: 'Zahlungsdatum muss ein gueltiges Datum sein' })
  paidAt!: string;

  @ApiPropertyOptional({
    description: 'Optional notes about this payment',
    example: 'Barbezahlung',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Notizen duerfen maximal 500 Zeichen lang sein' })
  notes?: string;
}
