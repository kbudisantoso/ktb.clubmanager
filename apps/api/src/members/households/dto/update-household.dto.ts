import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateHouseholdDto {
  @ApiPropertyOptional({
    description: 'Household name',
    example: 'Familie Mueller',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200, { message: 'Haushaltsname darf maximal 200 Zeichen lang sein' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Primary contact member ID',
  })
  @IsString()
  @IsOptional()
  primaryContactId?: string;
}
