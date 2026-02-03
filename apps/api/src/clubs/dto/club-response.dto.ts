import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClubResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  legalName?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  visibility!: 'PUBLIC' | 'PRIVATE';

  @ApiPropertyOptional({ description: 'Formatted invite code (XXXX-XXXX)' })
  inviteCode?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  avatarInitials?: string;

  @ApiPropertyOptional()
  avatarColor?: string;

  @ApiPropertyOptional()
  tierId?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // Included for list views
  @ApiPropertyOptional({
    description: 'User roles in this club (if applicable)',
    type: [String],
  })
  roles?: string[];

  @ApiPropertyOptional({ description: 'User count in club' })
  userCount?: number;

  @ApiPropertyOptional({ description: 'Member count in club' })
  memberCount?: number;
}

export class MyClubResponseDto extends ClubResponseDto {
  @ApiProperty({ description: 'User roles in this club', type: [String] })
  declare roles: string[];

  @ApiProperty({ description: 'When user joined this club' })
  joinedAt!: Date;
}
