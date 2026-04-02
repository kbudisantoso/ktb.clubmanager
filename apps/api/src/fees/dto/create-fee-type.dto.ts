import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateFeeTypeDto {
  @ApiProperty({
    description: 'Display name (e.g., "Einzelbeitrag", "Familientarif")',
    example: 'Einzelbeitrag',
  })
  @IsString()
  @MinLength(1, { message: 'Name ist erforderlich' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional description explaining when this fee type applies',
    example: 'Standardbeitrag fuer Einzelmitglieder',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this fee type is currently available for selection',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
