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

  @ApiPropertyOptional({ description: 'Avatar color preset name' })
  avatarColor?: string;

  // --- Stammdaten ---

  @ApiPropertyOptional({ description: 'Club abbreviation / short code' })
  shortCode?: string;

  @ApiPropertyOptional({ description: 'Club founding date (YYYY-MM-DD)' })
  foundedAt?: string;

  // --- Adresse & Kontakt ---

  @ApiPropertyOptional({ description: 'Street name' })
  street?: string;

  @ApiPropertyOptional({ description: 'House number' })
  houseNumber?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  // --- Vereinsregister ---

  @ApiProperty({ description: 'Whether the club is a registered association (e.V.)' })
  isRegistered!: boolean;

  @ApiPropertyOptional({ description: 'Registry court (Amtsgericht)' })
  registryCourt?: string;

  @ApiPropertyOptional({ description: 'Registry number (VR-Nummer)' })
  registryNumber?: string;

  @ApiPropertyOptional({ description: 'Club purpose classification' })
  clubPurpose?: string;

  @ApiPropertyOptional({ description: 'Special organizational form' })
  clubSpecialForm?: string;

  // --- Steuerdaten ---

  @ApiPropertyOptional({ description: 'Tax number (Steuernummer)' })
  taxNumber?: string;

  @ApiPropertyOptional({ description: 'VAT identification number (USt-IdNr)' })
  vatId?: string;

  @ApiPropertyOptional({ description: 'Responsible tax office (Finanzamt)' })
  taxOffice?: string;

  @ApiProperty({ description: 'Non-profit status (Gemeinnuetzigkeit)' })
  isNonProfit!: boolean;

  // --- Bankverbindung ---

  @ApiPropertyOptional({ description: 'IBAN' })
  iban?: string;

  @ApiPropertyOptional({ description: 'BIC / SWIFT code' })
  bic?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  bankName?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  accountHolder?: string;

  // --- Betriebseinstellungen ---

  @ApiPropertyOptional({ description: 'Fiscal year start month (1-12)' })
  fiscalYearStartMonth?: number;

  @ApiPropertyOptional({ description: 'Default membership type ID (FK to MembershipType entity)' })
  defaultMembershipTypeId?: string;

  @ApiPropertyOptional({ description: 'Probation period in days' })
  probationPeriodDays?: number;

  // --- Logo ---

  @ApiPropertyOptional({ description: 'Logo file ID' })
  logoFileId?: string;

  // --- Deactivation ---

  @ApiPropertyOptional({ description: 'When the club was deactivated (ISO 8601)' })
  deactivatedAt?: string | null;

  @ApiPropertyOptional({ description: 'User ID who initiated the deactivation' })
  deactivatedBy?: string | null;

  @ApiPropertyOptional({
    description: 'When the club is scheduled for permanent deletion (ISO 8601)',
  })
  scheduledDeletionAt?: string | null;

  @ApiPropertyOptional({ description: 'Grace period in days before deletion' })
  gracePeriodDays?: number | null;

  // --- Relations & Meta ---

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
