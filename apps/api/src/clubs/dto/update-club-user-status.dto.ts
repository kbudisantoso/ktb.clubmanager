import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ClubUserStatus } from '../../../../../prisma/generated/client/index.js';

export class UpdateClubUserStatusDto {
  @ApiProperty({
    enum: ['ACTIVE', 'SUSPENDED'],
    description: 'New status for the user (only ACTIVE or SUSPENDED allowed)',
    example: 'SUSPENDED',
  })
  @IsEnum(ClubUserStatus, { message: 'Status muss ACTIVE oder SUSPENDED sein' })
  status!: ClubUserStatus;
}
