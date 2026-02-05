import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
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
  reason?: string;
}
