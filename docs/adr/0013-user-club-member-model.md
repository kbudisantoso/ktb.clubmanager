# 13. User-Club-Member Relationship Model

Date: 2026-01-29

## Status

Accepted

## Context

ktb.clubmanager needs to model the relationship between app users (people with login access), clubs (tenants), and members (people managed by clubs). Several complexities exist:

1. **Users vs Members**: A user (app account) is distinct from a member (club-managed person data). A user may or may not be a member of a club they have access to.

2. **Multi-Club Access**: Users may belong to multiple clubs with different roles (e.g., Admin in Club A, Treasurer in Club B).

3. **Group Memberships**: Club memberships can cover multiple people (e.g., family membership with 2 adults + children).

4. **Super Admin**: System-wide administrators need access to manage all clubs and users.

5. **Club Visibility**: Clubs may be public (searchable) or private (invite-only).

## Decision

### Entity Model

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM LEVEL                            │
├─────────────────────────────────────────────────────────────────┤
│  User (Better Auth managed)                                     │
│  ├── id, email, name, image, emailVerified                      │
│  ├── isSuperAdmin: boolean (default false)                      │
│  └── ClubUser[] (club access records)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         CLUB LEVEL                              │
├─────────────────────────────────────────────────────────────────┤
│  Club (tenant)                                                  │
│  ├── id, name, slug (unique)                                    │
│  ├── visibility: PUBLIC | PRIVATE                               │
│  ├── inviteCode: string? (for private clubs)                    │
│  ├── settings: JSON                                             │
│  └── ClubUser[], Member[], MembershipType[]                     │
│                                                                 │
│  ClubUser (user's access to a club)                             │
│  ├── userId + clubId (composite unique)                         │
│  ├── roles: ClubRole[] (OWNER, ADMIN, TREASURER, SECRETARY, MEMBER) │
│  ├── memberId?: links user to their Member record if applicable │
│  ├── status: ACTIVE | PENDING | SUSPENDED                       │
│  └── joinedAt, invitedById                                      │
│                                                                 │
│  MembershipType (club-defined membership templates)             │
│  ├── id, clubId, name                                           │
│  ├── minMembers, maxMembers (e.g., Family: 2-6)                 │
│  ├── annualFee: Decimal (basic pricing - Phase 12 expands)      │
│  └── isDefault: boolean                                         │
│                                                                 │
│  Membership (a membership contract - can cover N people)        │
│  ├── id, clubId, membershipTypeId                               │
│  ├── status: ACTIVE | PENDING | CANCELLED                       │
│  ├── startDate, endDate?                                        │
│  └── MembershipMember[]                                         │
│                                                                 │
│  MembershipMember (junction: membership ↔ member)               │
│  ├── membershipId + memberId (composite unique)                 │
│  ├── role: PRIMARY | DEPENDENT                                  │
│  └── joinedAt                                                   │
│                                                                 │
│  Member (club-managed person, may or may not have app access)   │
│  ├── id, clubId                                                 │
│  ├── firstName, lastName, email?, phone?, address?              │
│  ├── dateOfBirth?                                               │
│  ├── status: ACTIVE | INACTIVE | PENDING                        │
│  ├── userId?: optional link to User for app access              │
│  └── MembershipMember[]                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Decisions

#### 1. First User Bootstrap
The first user to register becomes Super Admin automatically. A database migration handles existing users by promoting the first created user.

**Rationale:** Simplest onboarding for self-hosted deployments. No separate setup step required.

#### 2. Club Creation
Only Super Admins can create clubs. This prevents uncontrolled tenant proliferation and supports future SaaS billing integration where club creation is triggered by subscription purchase.

**Rationale:** Controlled growth, clear upgrade path to SaaS model.

#### 3. Club Visibility & Access

| Visibility | Discovery | Access Flow |
|------------|-----------|-------------|
| **PUBLIC** | Searchable in app | User finds → Requests access → Admin approves |
| **PRIVATE** | Hidden | User has invite code → Enters code → Requests access → Admin approves |

Email-based invitations with unique links. Invite codes identify which club to request access to.

#### 4. User-Member Linking
- **Auto-link**: When user gains club access, if a Member with matching email exists, auto-link `userId`
- **Manual link**: Club admin can manually link if emails don't match
- **No link**: User can have club access without being a Member (e.g., external accountant)

#### 5. Club-Level Roles

Users can have multiple roles per club (additive permissions).

**Board Roles (Vorstand)** — membership-bound:

| Role | German | Permissions |
|------|--------|-------------|
| **OWNER** | Verantwortlicher | Full control, delete club, transfer ownership, assign OWNER role |
| **TREASURER** | Kassierer | Financial features (fees, bookkeeping, SEPA, reports), member CRUD |
| **SECRETARY** | Schriftführer | Member CRUD, protocol management, finance read-only |

**Non-Board Roles:**

| Role | German | Permissions | Membership-bound |
|------|--------|-------------|------------------|
| **ADMIN** | Admin | Manage club users, edit settings (NOT finance, NOT members) | No (can be external) |
| **MEMBER** | Mitglied | View/edit own profile, dashboard access | Yes |

**Key distinctions:**
- ADMIN is a **technical role** (external consultant, tech support) — NOT a board member
- Board members (OWNER, TREASURER, SECRETARY) are always club members
- Protocol visibility: "board-only" = OWNER + TREASURER + SECRETARY (not ADMIN)

Roles are per-club. Same user can have different roles in different clubs.

#### 6. Self-Service Role Management

Users with role management permissions (OWNER, ADMIN) can edit their **own** roles with specific restrictions to prevent privilege escalation and orphaned clubs.

**Allowed Self-Actions:**

| Action | Condition |
|--------|-----------|
| Add assignable roles (MEMBER, TREASURER, SECRETARY) | Always allowed for ADMIN/OWNER |
| Add ADMIN role | Only if current user is OWNER |
| Remove non-critical roles | At least one role must remain |
| Remove OWNER role | Another OWNER must exist **AND** user keeps another role |

**Blocked Self-Actions:**

| Action | Reason |
|--------|--------|
| Add OWNER role to self | Privilege escalation |
| Remove all roles | Use "Leave Club" function instead |
| Remove OWNER as last owner | Prevents orphaned club |
| Remove OWNER without keeping another role | Prevents accidental lockout |

**Rationale:**

Industry research (GitHub, Google Workspace, Slack) shows that most SaaS platforms prevent users from editing their own roles entirely. However, this creates UX friction for legitimate use cases:

- Admin becomes club member → should be able to add MEMBER role
- Owner delegates ownership → should be able to step down if another owner exists

The implemented approach balances security (no privilege escalation, no orphaned clubs) with usability (legitimate self-service operations allowed).

**Implementation:**
- Backend enforces all rules in `ClubUsersService.updateClubUserRoles()`
- Frontend provides guidance in `RoleEditDialog` (disabled checkboxes, explanatory text)
- "Remove from club" action hidden for self (use "Leave Club" instead)

### User Experience by Club Count

| State | Dashboard Shows | Available Actions |
|-------|-----------------|-------------------|
| **0 clubs** | Onboarding empty state | "Verein erstellen" (if Super Admin), "Einladungscode eingeben" |
| **1 club** | Direct club dashboard | Club features per role |
| **2+ clubs** | Club selector/switcher | Switch clubs, each club has own dashboard |

### Navigation Structure

```
[Logo]                    [Club Switcher] [UserMenu]
─────────────────────────────────────────────────────
CLUB CONTEXT (when club selected)
├── Dashboard
├── Mitglieder
├── Beiträge
├── Buchhaltung
├── SEPA
├── Berichte
└── Einstellungen

SUPER ADMIN (if user.isSuperAdmin)
├── Vereine verwalten
├── Benutzer verwalten
└── Systemeinstellungen
```

## Consequences

**Positive:**
- Clear separation between app users and club member data
- Flexible: user can access clubs without being a member
- Supports group/family memberships from the start
- Single permission model works for all club sizes
- Super Admin area cleanly separated from club context

**Negative:**
- More complex than simple user-belongs-to-club model
- ClubUser + Member + MembershipMember adds joins
- Must maintain User-Member link consistency

**Neutral:**
- Requires club context in most routes
- Club switcher component needed for multi-club users

## Phase Implementation

| Phase | Implements |
|-------|------------|
| **8** | Club, ClubUser, club switcher, first-user bootstrap |
| **8.1** | Super Admin UI (CRUD clubs, users, assignments) |
| **9** | Role-based permissions, guards |
| **10** | Member, MembershipType, Membership, MembershipMember |

## Future Considerations (Post-MVP)

- API endpoint for external billing system to create clubs
- Stripe webhook integration for subscription management
- Plan-based feature limits (max members, etc.)
- Audit logging for compliance

## References

- ADR 0010: Row-Level Tenant Isolation
- TENANT-01 through TENANT-04 requirements
- ROLE-01 through ROLE-04 requirements
