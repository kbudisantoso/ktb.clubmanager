import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum AccessRejectionReason {
  BOARD_ONLY = 'BOARD_ONLY',
  UNIDENTIFIED = 'UNIDENTIFIED',
  WRONG_CLUB = 'WRONG_CLUB',
  CONTACT_DIRECTLY = 'CONTACT_DIRECTLY',
  OTHER = 'OTHER',
}

/**
 * Roles that can be assigned via access request approval.
 * OWNER cannot be assigned this way (only via transfer).
 * ADMIN can only be assigned by OWNER.
 */
export const ASSIGNABLE_ROLES = ['MEMBER', 'TREASURER', 'SECRETARY', 'ADMIN'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export class ApproveAccessRequestDto {
  @ApiProperty({
    description: 'Roles to assign to the user (at least one required)',
    type: [String],
    enum: ASSIGNABLE_ROLES,
    example: ['MEMBER'],
  })
  @IsString({ each: true })
  roles!: AssignableRole[];
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
