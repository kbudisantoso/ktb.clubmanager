import { z } from 'zod';
import {
  MemberStatusSchema,
  LeftCategorySchema,
  PersonTypeSchema,
  SalutationSchema,
  HouseholdRoleSchema,
  DeletionReasonSchema,
} from './member-status.ts';
import { AddressSchema } from './address.ts';

/**
 * Schema for creating a new member.
 * Covers all fields from CONTEXT.md including person type conditional validation.
 * IMPORTANT: No z.coerce usage (Pitfall 5 from RESEARCH.md).
 */
export const CreateMemberSchema = z
  .object({
    /** Person type - NATURAL person or LEGAL_ENTITY (company, association) */
    personType: PersonTypeSchema.default('NATURAL'),

    /** Salutation - Anrede (HERR/FRAU/DIVERS) */
    salutation: SalutationSchema.optional(),

    /** Academic or professional title (Dr., Prof. Dr., etc.) */
    title: z.string().max(50).optional(),

    /** First name (required for all members) */
    firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),

    /** Last name (required for all members) */
    lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),

    /** Nickname / club name (Spitzname/Clubname) */
    nickname: z.string().max(100).optional(),

    /** Organization name - required for LEGAL_ENTITY person type */
    organizationName: z.string().max(200).optional(),

    /** Contact person first name (for LEGAL_ENTITY) */
    contactFirstName: z.string().max(100).optional(),

    /** Contact person last name (for LEGAL_ENTITY) */
    contactLastName: z.string().max(100).optional(),

    /** Department within organization (for LEGAL_ENTITY) */
    department: z.string().max(100).optional(),

    /** Position/title within organization (for LEGAL_ENTITY) */
    position: z.string().max(100).optional(),

    /** VAT ID / Steuernummer (for LEGAL_ENTITY) */
    vatId: z.string().max(50).optional(),

    /** Club communication email (independent from User login email) */
    email: z.string().email('Ungueltige E-Mail-Adresse').optional().or(z.literal('')),

    /** Phone number (landline or general) */
    phone: z.string().max(30).optional(),

    /** Mobile phone number */
    mobile: z.string().max(30).optional(),

    /** Free text notes for additional information */
    notes: z.string().max(5000).optional(),

    /** Member number override (auto-generated via NumberRange if empty) */
    memberNumber: z.string().max(50).optional(),

    /** Member status (defaults to PENDING for new members) */
    status: MemberStatusSchema.default('PENDING'),

    /** Join/entry date as ISO date string YYYY-MM-DD (NOT z.coerce.date()) */
    joinDate: z.string().date('Ungueltiges Datum (YYYY-MM-DD erwartet)').optional(),

    /** Membership type ID (FK to MembershipType entity) for initial membership period */
    membershipTypeId: z.string().optional(),
  })
  .merge(AddressSchema)
  .refine(
    (data) =>
      data.personType !== 'LEGAL_ENTITY' ||
      (data.organizationName && data.organizationName.trim().length > 0),
    {
      message: 'Organisationsname ist bei juristischen Personen erforderlich',
      path: ['organizationName'],
    }
  );

export type CreateMember = z.infer<typeof CreateMemberSchema>;

/**
 * Schema for updating an existing member.
 * All fields optional for partial updates.
 */
export const UpdateMemberSchema = z
  .object({
    personType: PersonTypeSchema.optional(),
    salutation: SalutationSchema.optional(),
    title: z.string().max(50).optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    nickname: z.string().max(100).optional(),
    organizationName: z.string().max(200).optional(),
    contactFirstName: z.string().max(100).optional(),
    contactLastName: z.string().max(100).optional(),
    department: z.string().max(100).optional(),
    position: z.string().max(100).optional(),
    vatId: z.string().max(50).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    mobile: z.string().max(30).optional(),
    notes: z.string().max(5000).optional(),
    memberNumber: z.string().max(50).optional(),
    // Note: status removed from UpdateMemberSchema — status changes go through
    // dedicated ChangeStatusSchema endpoint (see C-3 consistency requirement)
    joinDate: z.string().date().optional(),
    membershipTypeId: z.string().optional(),
  })
  .merge(AddressSchema.partial());

export type UpdateMember = z.infer<typeof UpdateMemberSchema>;

/**
 * Full member response schema including server-generated fields.
 */
export const MemberResponseSchema = z.object({
  id: z.string(),
  clubId: z.string(),

  personType: PersonTypeSchema,
  salutation: SalutationSchema.nullable().optional(),
  title: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string().nullable().optional(),

  organizationName: z.string().nullable().optional(),
  contactFirstName: z.string().nullable().optional(),
  contactLastName: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  vatId: z.string().nullable().optional(),

  street: z.string().nullable().optional(),
  houseNumber: z.string().nullable().optional(),
  addressExtra: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string(),

  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),

  memberNumber: z.string(),
  status: MemberStatusSchema,
  joinDate: z.string().nullable().optional(),
  membershipTypeId: z.string().nullable().optional(),

  statusChangedAt: z.string().nullable().optional(),
  statusChangedBy: z.string().nullable().optional(),
  statusChangeReason: z.string().nullable().optional(),
  cancellationDate: z.string().nullable().optional(),
  cancellationReceivedAt: z.string().nullable().optional(),

  householdId: z.string().nullable().optional(),
  /** Role within the household (HEAD, SPOUSE, CHILD, OTHER) */
  householdRole: HouseholdRoleSchema.nullable().optional(),

  /** Link to application User account (nullable, set by OWNER/SECRETARY) */
  userId: z.string().nullable().optional(),

  /** Date when DSGVO deletion was requested (date-only YYYY-MM-DD) */
  dsgvoRequestDate: z.string().date().nullable().optional(),

  anonymizedAt: z.string().nullable().optional(),
  anonymizedBy: z.string().nullable().optional(),

  deletedAt: z.string().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
  /** Reason for deletion (AUSTRITT, AUSSCHLUSS, DATENSCHUTZ, SONSTIGES) */
  deletionReason: DeletionReasonSchema.nullable().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MemberResponse = z.infer<typeof MemberResponseSchema>;

/**
 * Query parameters for member list endpoint.
 * Supports search, cursor-based pagination, and status filter.
 */
export const MemberQuerySchema = z.object({
  /** Full-text search across name, memberNumber, email */
  search: z.string().optional(),

  /** Cursor for pagination (last item ID) */
  cursor: z.string().optional(),

  /** Items per page (1-100, default 50) */
  limit: z.number().int().min(1).max(100).default(50),

  /** Filter by member status */
  status: MemberStatusSchema.optional(),
});

export type MemberQuery = z.infer<typeof MemberQuerySchema>;

/**
 * Schema for changing a member's status with reason and optional effective date.
 * Status changes are not inline - they require reason documentation.
 */
export const ChangeStatusSchema = z.object({
  /** Target status */
  newStatus: MemberStatusSchema,

  /** Reason for the status change (visible in timeline, not just audit log) */
  reason: z.string().min(1, 'Grund ist erforderlich').max(500),

  /** Effective date of the status change (ISO date string YYYY-MM-DD) */
  effectiveDate: z.string().date().optional(),

  /** Category for LEFT transitions (required when newStatus is LEFT) */
  leftCategory: LeftCategorySchema.optional(),
});

export type ChangeStatus = z.infer<typeof ChangeStatusSchema>;

/**
 * Response schema for a single status transition record.
 */
export const MemberStatusTransitionResponseSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  clubId: z.string(),
  fromStatus: MemberStatusSchema,
  toStatus: MemberStatusSchema,
  reason: z.string(),
  leftCategory: LeftCategorySchema.nullable().optional(),
  effectiveDate: z.string(),
  actorId: z.string(),
  createdAt: z.string(),
});

export type MemberStatusTransitionResponse = z.infer<typeof MemberStatusTransitionResponseSchema>;
