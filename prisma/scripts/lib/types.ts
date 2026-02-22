/**
 * TypeScript interfaces for the Club Export/Import YAML format.
 *
 * All references use natural keys (email, code, memberNumber, name)
 * instead of database IDs to keep the format human-readable and editable.
 */

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export interface ClubExportData {
  meta: ExportMeta;
  club: ExportClub;
  users?: ExportUser[];
  membershipTypes?: ExportMembershipType[];
  numberRanges?: ExportNumberRange[];
  households?: ExportHousehold[];
  members?: ExportMember[];
}

export interface ExportMeta {
  version: string;
  exportedAt?: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Club
// ---------------------------------------------------------------------------

export interface ExportClub {
  name: string;
  slug: string;
  legalName?: string;
  shortCode?: string;
  description?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  avatarColor?: string;
  foundedAt?: string;
  // Address
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  // Registry
  isRegistered?: boolean;
  registryCourt?: string;
  registryNumber?: string;
  clubPurpose?: 'IDEALVEREIN' | 'WIRTSCHAFTLICH';
  clubSpecialForm?: 'KEINE' | 'TRAEGERVEREIN' | 'FOERDERVEREIN' | 'DACHVERBAND';
  // Tax
  taxNumber?: string;
  vatId?: string;
  taxOffice?: string;
  isNonProfit?: boolean;
  // Bank
  iban?: string;
  bic?: string;
  bankName?: string;
  accountHolder?: string;
  // Operations
  fiscalYearStartMonth?: number;
  probationPeriodDays?: number;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface ExportUser {
  email: string;
  name: string;
  clubRoles: Array<'OWNER' | 'ADMIN' | 'TREASURER' | 'SECRETARY' | 'MEMBER'>;
  // Password — exactly one or none
  password?: string;
  passwordHash?: string;
  // Optional
  isSuperAdmin?: boolean;
  locale?: string;
  clubStatus?: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  isExternal?: boolean;
}

// ---------------------------------------------------------------------------
// MembershipType
// ---------------------------------------------------------------------------

export interface ExportMembershipType {
  name: string;
  code: string;
  description?: string;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  vote?: boolean;
  assemblyAttendance?: boolean;
  eligibleForOffice?: boolean;
  color?: 'BLUE' | 'GREEN' | 'PURPLE' | 'AMBER' | 'ROSE' | 'TEAL' | 'SLATE' | 'INDIGO';
}

// ---------------------------------------------------------------------------
// NumberRange
// ---------------------------------------------------------------------------

export interface ExportNumberRange {
  entityType: string;
  prefix?: string;
  currentValue?: number;
  padLength?: number;
  yearReset?: boolean;
}

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export interface ExportHousehold {
  name: string;
  primaryContactMemberNumber?: string;
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

export interface ExportMember {
  memberNumber: string;
  firstName: string;
  lastName: string;
  // Type
  personType?: 'NATURAL' | 'LEGAL_ENTITY';
  // Natural person
  salutation?: 'HERR' | 'FRAU' | 'DIVERS';
  title?: string;
  nickname?: string;
  // Legal entity
  organizationName?: string;
  contactFirstName?: string;
  contactLastName?: string;
  department?: string;
  position?: string;
  vatId?: string;
  // Address
  street?: string;
  houseNumber?: string;
  addressExtra?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  // Contact
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
  // Status
  status?: 'PENDING' | 'PROBATION' | 'ACTIVE' | 'DORMANT' | 'SUSPENDED' | 'LEFT';
  // Membership (both → first MembershipPeriod)
  joinDate?: string;
  membershipTypeCode?: string;
  // Links
  userEmail?: string;
  householdName?: string;
  householdRole?: 'HEAD' | 'SPOUSE' | 'CHILD' | 'OTHER';
}
