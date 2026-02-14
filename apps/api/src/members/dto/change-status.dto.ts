import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { MemberStatusDto, LeftCategoryDto } from './create-member.dto.js';

export class ChangeStatusDto {
  @ApiProperty({
    description: 'New status for the member',
    enum: MemberStatusDto,
  })
  @IsEnum(MemberStatusDto)
  newStatus!: MemberStatusDto;

  @ApiProperty({
    description: 'Reason for the status change',
    example: 'Aufnahme nach Vorstandsbeschluss',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1, { message: 'Begruendung ist erforderlich' })
  @MaxLength(500, { message: 'Begruendung darf maximal 500 Zeichen lang sein' })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Effective date (YYYY-MM-DD), defaults to today',
    example: '2025-06-01',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: 'Category for LEFT transitions (required when newStatus is LEFT)',
    enum: LeftCategoryDto,
  })
  @IsEnum(LeftCategoryDto)
  @IsOptional()
  leftCategory?: LeftCategoryDto;
}

export class SetCancellationDto {
  @ApiProperty({
    description: 'Date when membership ends (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  cancellationDate!: string;

  @ApiProperty({
    description: 'Date when cancellation was received (YYYY-MM-DD)',
    example: '2025-10-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Datum muss im Format YYYY-MM-DD sein',
  })
  cancellationReceivedAt!: string;

  @ApiProperty({
    description: 'Reason for the cancellation',
    example: 'Kuendigung per Brief',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1, { message: 'Begruendung ist erforderlich' })
  @MaxLength(500, { message: 'Begruendung darf maximal 500 Zeichen lang sein' })
  reason!: string;
}

export class BulkChangeStatusDto {
  @ApiProperty({
    description: 'Member IDs to change status for',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Mindestens ein Mitglied muss ausgewaehlt werden' })
  @ArrayMaxSize(100, { message: 'Maximal 100 Mitglieder gleichzeitig aenderbar' })
  @IsString({ each: true })
  memberIds!: string[];

  @ApiProperty({
    description: 'New status for all members',
    enum: MemberStatusDto,
  })
  @IsEnum(MemberStatusDto)
  newStatus!: MemberStatusDto;

  @ApiProperty({
    description: 'Reason for the status change',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1, { message: 'Begruendung ist erforderlich' })
  @MaxLength(500, { message: 'Begruendung darf maximal 500 Zeichen lang sein' })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Category for LEFT transitions (required when newStatus is LEFT)',
    enum: LeftCategoryDto,
  })
  @IsEnum(LeftCategoryDto)
  @IsOptional()
  leftCategory?: LeftCategoryDto;
}
