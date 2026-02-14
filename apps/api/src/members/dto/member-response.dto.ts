import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HouseholdSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class MembershipPeriodSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Join date (YYYY-MM-DD)' })
  joinDate!: string;

  @ApiPropertyOptional({ description: 'Leave date (YYYY-MM-DD), null if current' })
  leaveDate?: string | null;

  @ApiPropertyOptional()
  membershipTypeId?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;
}

export class MemberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clubId!: string;

  @ApiProperty()
  memberNumber!: string;

  @ApiProperty()
  personType!: string;

  @ApiPropertyOptional()
  salutation?: string | null;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  nickname?: string | null;

  // Legal entity fields
  @ApiPropertyOptional()
  organizationName?: string | null;

  @ApiPropertyOptional()
  contactFirstName?: string | null;

  @ApiPropertyOptional()
  contactLastName?: string | null;

  @ApiPropertyOptional()
  department?: string | null;

  @ApiPropertyOptional()
  position?: string | null;

  @ApiPropertyOptional()
  vatId?: string | null;

  // Address
  @ApiPropertyOptional()
  street?: string | null;

  @ApiPropertyOptional()
  houseNumber?: string | null;

  @ApiPropertyOptional()
  addressExtra?: string | null;

  @ApiPropertyOptional()
  postalCode?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiProperty()
  country!: string;

  // Contact
  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  mobile?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  // Status
  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  statusChangedAt?: string | null;

  @ApiPropertyOptional()
  statusChangedBy?: string | null;

  @ApiPropertyOptional()
  statusChangeReason?: string | null;

  @ApiPropertyOptional({ description: 'Cancellation date (YYYY-MM-DD)' })
  cancellationDate?: string | null;

  @ApiPropertyOptional()
  cancellationReceivedAt?: string | null;

  // DSGVO
  @ApiPropertyOptional()
  dsgvoRequestDate?: string | null;

  @ApiPropertyOptional()
  anonymizedAt?: string | null;

  @ApiPropertyOptional()
  anonymizedBy?: string | null;

  // User linking
  @ApiPropertyOptional()
  userId?: string | null;

  // Household
  @ApiPropertyOptional()
  householdId?: string | null;

  @ApiPropertyOptional()
  householdRole?: string | null;

  @ApiPropertyOptional({ type: HouseholdSummaryDto })
  household?: HouseholdSummaryDto | null;

  // Membership periods
  @ApiPropertyOptional({ type: [MembershipPeriodSummaryDto] })
  membershipPeriods?: MembershipPeriodSummaryDto[];

  // Soft deletion
  @ApiPropertyOptional()
  deletedAt?: string | null;

  @ApiPropertyOptional()
  deletedBy?: string | null;

  @ApiPropertyOptional()
  deletionReason?: string | null;

  // Timestamps
  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedMembersResponseDto {
  @ApiProperty({ type: [MemberResponseDto] })
  items!: MemberResponseDto[];

  @ApiPropertyOptional({ description: 'Cursor for next page (null if no more pages)' })
  nextCursor?: string | null;

  @ApiProperty({ description: 'Whether there are more items' })
  hasMore!: boolean;

  @ApiProperty({ description: 'Total count of matching members' })
  totalCount!: number;
}
