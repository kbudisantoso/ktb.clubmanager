import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum AccessRejectionReason {
  BOARD_ONLY = 'BOARD_ONLY',
  UNIDENTIFIED = 'UNIDENTIFIED',
  WRONG_CLUB = 'WRONG_CLUB',
  CONTACT_DIRECTLY = 'CONTACT_DIRECTLY',
  OTHER = 'OTHER',
}

export class ApproveAccessRequestDto {
  @ApiProperty({
    description: 'Role to assign to the user',
    enum: ['VIEWER', 'TREASURER', 'ADMIN'],
    default: 'VIEWER',
  })
  @IsEnum(['VIEWER', 'TREASURER', 'ADMIN'])
  role!: 'VIEWER' | 'TREASURER' | 'ADMIN';
}

export class RejectAccessRequestDto {
  @ApiProperty({
    description: 'Rejection reason',
    enum: AccessRejectionReason,
  })
  @IsEnum(AccessRejectionReason)
  reason!: AccessRejectionReason;

  @ApiPropertyOptional({
    description: 'Custom note (required for OTHER reason)',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
