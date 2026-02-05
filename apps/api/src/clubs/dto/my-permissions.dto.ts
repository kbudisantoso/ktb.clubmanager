import { ApiProperty } from '@nestjs/swagger';

export class TierFeaturesDto {
  @ApiProperty({ description: 'SEPA direct debit enabled' })
  sepa!: boolean;

  @ApiProperty({ description: 'Financial reports enabled' })
  reports!: boolean;

  @ApiProperty({ description: 'Bank statement import enabled' })
  bankImport!: boolean;
}

export class MyPermissionsResponseDto {
  @ApiProperty({
    description: 'User permissions in this club (derived from roles)',
    example: ['member:read', 'member:create', 'finance:read'],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'Tier features available to this club',
    type: TierFeaturesDto,
  })
  features!: TierFeaturesDto;

  @ApiProperty({
    description: 'User roles in this club',
    example: ['TREASURER'],
  })
  roles!: string[];
}
