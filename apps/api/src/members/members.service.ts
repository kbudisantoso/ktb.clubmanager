import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NumberRangesService } from '../number-ranges/number-ranges.service.js';
import type { CreateMemberDto } from './dto/create-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';
import type { MemberQueryDto } from './dto/member-query.dto.js';
import { Prisma } from '../../../../prisma/generated/client/index.js';

/**
 * Helper to format a Date to YYYY-MM-DD string.
 * Avoids timezone shift issues with Prisma @db.Date fields.
 */
function toDateString(date: Date | null | undefined): string | null {
  if (!date) return null;
  // Use UTC methods to avoid timezone shift
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to format a DateTime to ISO string.
 */
function toISOStringOrNull(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

/** Safe mapping of sortBy values to Prisma column names (defense-in-depth). */
const SORT_FIELD_MAP: Record<string, string> = {
  lastName: 'lastName',
  firstName: 'firstName',
  memberNumber: 'memberNumber',
  status: 'status',
  createdAt: 'createdAt',
};

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private prisma: PrismaService,
    private numberRangesService: NumberRangesService
  ) {}

  /**
   * List members with cursor-based pagination, search, and filtering.
   */
  async findAll(clubId: string, query: MemberQueryDto) {
    const db = this.prisma.forClub(clubId);
    const limit = query.limit ?? 50;
    const sortBy = SORT_FIELD_MAP[query.sortBy ?? 'lastName'] ?? 'lastName';
    const sortOrder = query.sortOrder ?? 'asc';

    // Build WHERE clause
    const where: Prisma.MemberWhereInput = {
      deletedAt: null,
      ...(query.status &&
        query.status.length > 0 && {
          status:
            query.status.length === 1
              ? query.status[0] // Single value: exact match (backwards compat)
              : { in: query.status }, // Multiple values: IN query
        }),
      ...(query.householdFilter === 'HAS' && { householdId: { not: null } }),
      ...(query.householdFilter === 'NONE' && { householdId: null }),
      ...(query.householdFilter &&
        !['HAS', 'NONE'].includes(query.householdFilter) && {
          householdId: { in: query.householdFilter.split(',') },
        }),
      ...(query.periodYear && {
        membershipPeriods: {
          some: {
            joinDate: { lte: new Date(`${query.periodYear}-12-31`) },
            OR: [
              { leaveDate: null },
              { leaveDate: { gte: new Date(`${query.periodYear}-01-01`) } },
            ],
          },
        },
      }),
      ...(query.search && {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' as const } },
          { lastName: { contains: query.search, mode: 'insensitive' as const } },
          { memberNumber: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
          { organizationName: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // Run data query and count query in parallel
    const [members, totalCount] = await Promise.all([
      db.member.findMany({
        where,
        take: limit + 1, // Fetch one extra to detect next page
        ...(query.cursor && {
          cursor: { id: query.cursor },
          skip: 1, // Skip the cursor itself
        }),
        orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
        include: {
          household: { select: { id: true, name: true } },
          membershipPeriods: {
            where: {
              joinDate: { lte: new Date() },
              OR: [{ leaveDate: null }, { leaveDate: { gt: new Date() } }],
            },
            take: 1,
            orderBy: { joinDate: 'desc' },
          },
          user: { select: { image: true } },
        },
      }),
      db.member.count({ where }),
    ]);

    const hasMore = members.length > limit;
    const items = hasMore ? members.slice(0, -1) : members;
    const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
    const nextCursor = hasMore && lastItem ? lastItem.id : null;

    return {
      items: items.map((m) => this.formatMemberResponse(m)),
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Get a single member with full relations.
   */
  async findOne(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id, deletedAt: null },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            primaryContactId: true,
            members: {
              where: { deletedAt: null },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                householdRole: true,
                memberNumber: true,
              },
            },
          },
        },
        membershipPeriods: {
          orderBy: { joinDate: 'desc' },
        },
        statusTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        user: { select: { image: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    return this.formatMemberResponse(member);
  }

  /**
   * Create a new member.
   * Auto-generates member number if not provided.
   */
  async create(clubId: string, dto: CreateMemberDto, userId: string) {
    const db = this.prisma.forClub(clubId);

    // Generate or validate member number
    let memberNumber = dto.memberNumber;
    if (!memberNumber) {
      try {
        memberNumber = await this.numberRangesService.generateNext(clubId, 'MEMBER');
      } catch {
        throw new BadRequestException(
          'Mitgliedsnummer konnte nicht generiert werden. Bitte Nummernkreis einrichten.'
        );
      }
    } else {
      // Validate uniqueness within club
      const existing = await db.member.findFirst({
        where: { memberNumber },
      });
      if (existing) {
        throw new ConflictException(`Mitgliedsnummer "${memberNumber}" ist bereits vergeben`);
      }
    }

    // Build create data with explicit clubId for TypeScript
    // (tenant extension also injects clubId at runtime)
    const createData: Prisma.MemberUncheckedCreateInput = {
      clubId,
      memberNumber,
      personType: dto.personType ?? 'NATURAL',
      salutation: dto.salutation,
      title: dto.title,
      firstName: dto.firstName,
      lastName: dto.lastName,
      nickname: dto.nickname,
      organizationName: dto.organizationName,
      contactFirstName: dto.contactFirstName,
      contactLastName: dto.contactLastName,
      department: dto.department,
      position: dto.position,
      vatId: dto.vatId,
      street: dto.street,
      houseNumber: dto.houseNumber,
      addressExtra: dto.addressExtra,
      postalCode: dto.postalCode,
      city: dto.city,
      country: dto.country ?? 'DE',
      email: dto.email,
      phone: dto.phone,
      mobile: dto.mobile,
      notes: dto.notes,
      status: dto.status ?? 'PENDING',
      statusChangedAt: new Date(),
      statusChangedBy: userId,
    };

    // Auto-create first membership period if joinDate and membershipTypeId provided
    if (dto.joinDate && dto.membershipTypeId) {
      (createData as Record<string, unknown>).membershipPeriods = {
        create: {
          joinDate: new Date(dto.joinDate),
          membershipTypeId: dto.membershipTypeId,
        },
      };
    }

    const member = await db.member.create({
      data: createData as Prisma.MemberUncheckedCreateInput,
      include: {
        household: { select: { id: true, name: true } },
        membershipPeriods: {
          orderBy: { joinDate: 'desc' },
        },
        user: { select: { image: true } },
      },
    });

    return this.formatMemberResponse(member);
  }

  /**
   * Update a member's fields.
   * Uses optimistic locking via version field to prevent concurrent update races.
   */
  async update(clubId: string, id: string, dto: UpdateMemberDto, _userId: string) {
    const db = this.prisma.forClub(clubId);

    // Extract version for optimistic locking
    const { version, ...dtoFields } = dto;

    // Check member exists and is not deleted
    const existing = await db.member.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    // If memberNumber changed, validate uniqueness
    if (dtoFields.memberNumber && dtoFields.memberNumber !== existing.memberNumber) {
      const duplicate = await db.member.findFirst({
        where: { memberNumber: dtoFields.memberNumber, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException(
          `Mitgliedsnummer "${dtoFields.memberNumber}" ist bereits vergeben`
        );
      }
    }

    // Build update data, only including provided fields
    const updateData: Record<string, unknown> = {};
    const fields = [
      'personType',
      'salutation',
      'title',
      'firstName',
      'lastName',
      'nickname',
      'organizationName',
      'contactFirstName',
      'contactLastName',
      'department',
      'position',
      'vatId',
      'street',
      'houseNumber',
      'addressExtra',
      'postalCode',
      'city',
      'country',
      'email',
      'phone',
      'mobile',
      'notes',
      'memberNumber',
    ] as const;

    for (const field of fields) {
      if (dtoFields[field] !== undefined) {
        updateData[field] = dtoFields[field];
      }
    }

    try {
      const updated = await db.member.update({
        where: { id, version },
        data: { ...updateData, version: { increment: 1 } },
        include: {
          household: { select: { id: true, name: true } },
          membershipPeriods: {
            orderBy: { joinDate: 'desc' },
          },
          user: { select: { image: true } },
        },
      });

      return this.formatMemberResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException(
          'Der Datensatz wurde zwischenzeitlich geändert. Bitte lade die Daten neu und versuche es erneut.'
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete a member.
   * Only allowed when status is LEFT.
   */
  async softDelete(clubId: string, id: string, userId: string, reason: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    if (member.status !== 'LEFT') {
      throw new BadRequestException(
        'Mitglied kann nur gelöscht werden, wenn der Status "Ausgetreten" ist'
      );
    }

    const updated = await db.member.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        deletionReason: reason as 'AUSTRITT' | 'AUSSCHLUSS' | 'DATENSCHUTZ' | 'SONSTIGES',
      },
      include: {
        household: { select: { id: true, name: true } },
        membershipPeriods: {
          orderBy: { joinDate: 'desc' },
        },
        user: { select: { image: true } },
      },
    });

    return this.formatMemberResponse(updated);
  }

  /**
   * Restore a soft-deleted member.
   */
  async restore(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (!member) {
      throw new NotFoundException('Gelöschtes Mitglied nicht gefunden');
    }

    const updated = await db.member.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
      },
      include: {
        household: { select: { id: true, name: true } },
        membershipPeriods: {
          orderBy: { joinDate: 'desc' },
        },
        user: { select: { image: true } },
      },
    });

    return this.formatMemberResponse(updated);
  }

  /**
   * Hard delete a member (permanent).
   * Only allowed if no membership periods exist.
   */
  async hardDelete(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id },
      include: {
        membershipPeriods: { select: { id: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    if (member.membershipPeriods.length > 0) {
      throw new BadRequestException(
        'Mitglied kann nicht endgültig gelöscht werden, da Mitgliedschaftszeiträume existieren'
      );
    }

    await db.member.delete({
      where: { id },
    });

    return { deleted: true };
  }

  /**
   * Anonymize a member's personal data (DSGVO Art. 17).
   * Irreversible. Only when status is LEFT.
   */
  async anonymize(clubId: string, id: string, userId: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    if (member.status !== 'LEFT') {
      throw new BadRequestException(
        'Anonymisierung ist nur moeglich, wenn der Status "Ausgetreten" ist'
      );
    }

    if (member.anonymizedAt) {
      throw new BadRequestException('Mitglied wurde bereits anonymisiert');
    }

    const anonymizedData: Record<string, unknown> = {
      firstName: 'Anonymisiert',
      lastName: 'Anonymisiert',
      salutation: null,
      title: null,
      nickname: null,
      contactFirstName: null,
      contactLastName: null,
      department: null,
      position: null,
      vatId: null,
      street: null,
      houseNumber: null,
      addressExtra: null,
      postalCode: null,
      city: null,
      email: null,
      phone: null,
      mobile: null,
      notes: null,
      householdId: null,
      householdRole: null,
      anonymizedAt: new Date(),
      anonymizedBy: userId,
    };

    // If legal entity, also anonymize organizationName
    if (member.personType === 'LEGAL_ENTITY') {
      anonymizedData.organizationName = 'Anonymisiert';
    }

    const updated = await db.member.update({
      where: { id },
      data: anonymizedData,
      include: {
        household: { select: { id: true, name: true } },
        membershipPeriods: {
          orderBy: { joinDate: 'desc' },
        },
        user: { select: { image: true } },
      },
    });

    // SEC-021: Clear MembershipPeriod notes (may contain PII)
    // MembershipPeriod dates (joinDate, leaveDate) are retained as statistical data.
    await db.membershipPeriod.updateMany({
      where: { memberId: id },
      data: { notes: null },
    });

    this.logger.log(`Member ${id} anonymized by user ${userId}`);

    return this.formatMemberResponse(updated);
  }

  /**
   * Get users that can be linked to a member.
   * Returns club users not yet linked to another member, with match info.
   */
  async getLinkableUsers(clubId: string, memberId: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true, userId: true },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    // Get all active club users
    const clubUsers = await this.prisma.clubUser.findMany({
      where: { clubId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // Get userIds already linked to other members in this club
    const linkedMembers = await db.member.findMany({
      where: { userId: { not: null }, id: { not: memberId }, deletedAt: null },
      select: { userId: true },
    });
    const linkedUserIds = new Set(linkedMembers.map((m) => m.userId));

    // Filter to unlinked users
    const linkableUsers = clubUsers
      .filter((cu) => !linkedUserIds.has(cu.userId))
      .map((cu) => ({
        userId: cu.userId,
        name: cu.user.name ?? cu.user.email,
        email: cu.user.email,
        image: cu.user.image ?? null,
      }));

    return {
      users: linkableUsers,
      currentLink: member.userId ?? null,
      member: {
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
      },
    };
  }

  /**
   * Link or unlink a user account to a member.
   * Pass userId = null to unlink.
   */
  async linkUser(clubId: string, memberId: string, userId: string | null) {
    const db = this.prisma.forClub(clubId);

    // Member lookup is automatically scoped to clubId via forClub() tenant extension
    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    if (userId !== null) {
      // Verify user is a club user
      const clubUser = await this.prisma.clubUser.findFirst({
        where: { clubId, userId, status: 'ACTIVE' },
      });

      if (!clubUser) {
        throw new BadRequestException('Benutzer ist kein Mitglied dieses Vereins');
      }

      // Verify no other member is linked to this user
      const existingLink = await db.member.findFirst({
        where: { userId, id: { not: memberId }, deletedAt: null },
      });

      if (existingLink) {
        throw new ConflictException(
          `Benutzer ist bereits mit Mitglied ${existingLink.memberNumber} verknüpft`
        );
      }
    }

    const updated = await db.member.update({
      where: { id: memberId },
      data: { userId },
      include: {
        household: {
          select: {
            id: true,
            name: true,
            primaryContactId: true,
            members: {
              where: { deletedAt: null },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                householdRole: true,
                memberNumber: true,
              },
            },
          },
        },
        membershipPeriods: { orderBy: { joinDate: 'desc' } },
        user: { select: { image: true } },
      },
    });

    return this.formatMemberResponse(updated);
  }

  /**
   * Format a member record for API response.
   * Converts Date objects to strings per RESEARCH.md Pitfall 2.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatMemberResponse(member: any) {
    // Format membership periods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = member.membershipPeriods?.map((p: any) => ({
      id: p.id,
      joinDate: toDateString(p.joinDate),
      leaveDate: toDateString(p.leaveDate),
      membershipTypeId: p.membershipTypeId ?? null,
      notes: p.notes ?? null,
      createdAt: toISOStringOrNull(p.createdAt),
      updatedAt: toISOStringOrNull(p.updatedAt),
    }));

    // Format status transitions (if included)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transitions = member.statusTransitions?.map((t: any) => ({
      id: t.id,
      toStatus: t.toStatus,
      reason: t.reason,
      leftCategory: t.leftCategory,
      effectiveDate: toDateString(t.effectiveDate),
      actorId: t.actorId,
      createdAt: toISOStringOrNull(t.createdAt),
    }));

    return {
      id: member.id,
      clubId: member.clubId,
      memberNumber: member.memberNumber,
      personType: member.personType,
      salutation: member.salutation ?? null,
      title: member.title ?? null,
      firstName: member.firstName,
      lastName: member.lastName,
      nickname: member.nickname ?? null,
      organizationName: member.organizationName ?? null,
      contactFirstName: member.contactFirstName ?? null,
      contactLastName: member.contactLastName ?? null,
      department: member.department ?? null,
      position: member.position ?? null,
      vatId: member.vatId ?? null,
      street: member.street ?? null,
      houseNumber: member.houseNumber ?? null,
      addressExtra: member.addressExtra ?? null,
      postalCode: member.postalCode ?? null,
      city: member.city ?? null,
      country: member.country,
      email: member.email ?? null,
      phone: member.phone ?? null,
      mobile: member.mobile ?? null,
      notes: member.notes ?? null,
      status: member.status,
      statusChangedAt: toISOStringOrNull(member.statusChangedAt),
      statusChangedBy: member.statusChangedBy ?? null,
      statusChangeReason: member.statusChangeReason ?? null,
      cancellationDate: toDateString(member.cancellationDate),
      cancellationReceivedAt: toISOStringOrNull(member.cancellationReceivedAt),
      dsgvoRequestDate: toDateString(member.dsgvoRequestDate),
      anonymizedAt: toISOStringOrNull(member.anonymizedAt),
      anonymizedBy: member.anonymizedBy ?? null,
      userId: member.userId ?? null,
      userImage: member.user?.image ?? null,
      householdId: member.householdId ?? null,
      householdRole: member.householdRole ?? null,
      household: member.household ?? null,
      membershipPeriods: periods ?? [],
      statusTransitions: transitions ?? undefined,
      deletedAt: toISOStringOrNull(member.deletedAt),
      deletedBy: member.deletedBy ?? null,
      deletionReason: member.deletionReason ?? null,
      version: member.version ?? 0,
      createdAt: toISOStringOrNull(member.createdAt),
      updatedAt: toISOStringOrNull(member.updatedAt),
    };
  }
}
