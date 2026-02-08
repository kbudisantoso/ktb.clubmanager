import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export enum HouseholdRoleDto {
  HEAD = 'HEAD',
  SPOUSE = 'SPOUSE',
  CHILD = 'CHILD',
  OTHER = 'OTHER',
}

export class CreateHouseholdDto {
  @ApiProperty({
    description: 'Household name (e.g., "Familie Mustermann")',
    example: 'Familie Mustermann',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1, { message: 'Haushaltsname muss mindestens 1 Zeichen lang sein' })
  @MaxLength(200, { message: 'Haushaltsname darf maximal 200 Zeichen lang sein' })
  name!: string;

  @ApiProperty({
    description: 'Member IDs to add to the household',
    type: [String],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Mindestens ein Mitglied muss zugeordnet werden' })
  @IsString({ each: true })
  memberIds!: string[];

  @ApiProperty({
    description: 'Roles for each member (key: memberId, value: HouseholdRole)',
    example: { memberId1: 'HEAD', memberId2: 'SPOUSE' },
  })
  @IsObject({ message: 'Rollen muessen als Objekt angegeben werden' })
  @IsNotEmpty({ message: 'Mindestens eine Rolle muss zugeordnet werden' })
  roles!: Record<string, HouseholdRoleDto>;

  @ApiPropertyOptional({
    description: 'ID of the primary contact member (must be in memberIds)',
  })
  @IsString()
  @IsOptional()
  primaryContactId?: string;
}

export class AddHouseholdMemberDto {
  @ApiProperty({ description: 'Member ID to add' })
  @IsString()
  memberId!: string;

  @ApiProperty({
    description: 'Role within the household',
    enum: HouseholdRoleDto,
  })
  @IsEnum(HouseholdRoleDto)
  role!: HouseholdRoleDto;
}

export class SyncAddressesDto {
  @ApiProperty({ description: 'Source member ID to copy address from' })
  @IsString()
  sourceMemberId!: string;

  @ApiProperty({
    description: 'Target member IDs to copy address to',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Mindestens ein Zielmitglied angeben' })
  @IsString({ each: true })
  targetMemberIds!: string[];
}
