import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, Matches } from 'class-validator';
import { FeeOverrideType } from '../../../../../prisma/generated/client/index.js';

export class CreateMemberFeeOverrideDto {
  @ApiProperty({
    description: 'Member ID to create override for',
  })
  @IsString()
  memberId!: string;

  @ApiPropertyOptional({
    description: 'Fee category ID (null if overriding base membership fee)',
  })
  @IsString()
  @IsOptional()
  feeCategoryId?: string;

  @ApiProperty({
    description: 'Type of override (EXEMPT, CUSTOM_AMOUNT, ADDITIONAL)',
    enum: FeeOverrideType,
  })
  @IsEnum(FeeOverrideType, { message: 'Ungültiger Override-Typ' })
  overrideType!: FeeOverrideType;

  @ApiPropertyOptional({
    description: 'Custom amount for CUSTOM_AMOUNT and ADDITIONAL types',
    example: '50.00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, {
    message: 'Betrag muss ein gültiges Dezimalformat haben (z.B. „50.00", max 8 Vorkommastellen)',
  })
  customAmount?: string;

  @ApiPropertyOptional({
    description: 'Reason for the override',
    example: 'Soziale Haertefallregelung',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether this override applies to the base membership fee',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isBaseFee?: boolean;
}
