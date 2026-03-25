import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { ClubRole } from '../../../../../prisma/generated/client/index.js';

export class InviteClubUserDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'max@example.com',
  })
  @IsEmail({}, { message: 'Bitte gib eine gültige E-Mail-Adresse ein' })
  email!: string;

  @ApiProperty({
    enum: ClubRole,
    isArray: true,
    description: 'Initial roles for the invited user',
    example: ['MEMBER'],
  })
  @IsArray()
  @IsEnum(ClubRole, { each: true })
  @ArrayMinSize(1, { message: 'Mindestens eine Rolle erforderlich' })
  roles!: ClubRole[];
}
