import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize, MaxLength } from 'class-validator';
import { ClubRole } from '../../../../../prisma/generated/client/index.js';

export class ClubUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiProperty({ enum: ClubRole, isArray: true })
  roles!: ClubRole[];

  @ApiProperty()
  joinedAt!: Date;

  @ApiProperty({ description: 'Whether the user is marked as external (no member profile needed)' })
  isExternal!: boolean;
}

export class UpdateClubUserRolesDto {
  @ApiProperty({
    enum: ClubRole,
    isArray: true,
    description: 'New roles for the user (replaces existing)',
    example: ['TREASURER', 'MEMBER'],
  })
  @IsArray()
  @IsEnum(ClubRole, { each: true })
  @ArrayMinSize(1, { message: 'Mindestens eine Rolle erforderlich' })
  roles!: ClubRole[];
}

export class RemoveClubUserDto {
  @ApiPropertyOptional({
    description: 'Optional reason for removal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Begründung darf maximal 500 Zeichen lang sein' })
  reason?: string;
}
