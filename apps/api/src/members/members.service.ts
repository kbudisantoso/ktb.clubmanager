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
import type { Prisma } from '../../../../prisma/generated/client/index.js';

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
    const sortBy = query.sortBy ?? 'lastName';
    const sortOrder = query.sortOrder ?? 'asc';

    // Build WHERE clause
    const where: Prisma.MemberWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
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
            where: { leaveDate: null },
            take: 1,
            orderBy: { joinDate: 'desc' },
          },
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

    // Auto-create first membership period if joinDate and membershipType provided
    if (dto.joinDate && dto.membershipType) {
      (createData as Record<string, unknown>).membershipPeriods = {
        create: {
          joinDate: new Date(dto.joinDate),
          membershipType: dto.membershipType,
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
      },
    });

    return this.formatMemberResponse(member);
  }

  /**
   * Update a member's fields.
   */
  async update(clubId: string, id: string, dto: UpdateMemberDto, _userId: string) {
    const db = this.prisma.forClub(clubId);

    // Check member exists and is not deleted
    const existing = await db.member.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    // If memberNumber changed, validate uniqueness
    if (dto.memberNumber && dto.memberNumber !== existing.memberNumber) {
      const duplicate = await db.member.findFirst({
        where: { memberNumber: dto.memberNumber, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException(`Mitgliedsnummer "${dto.memberNumber}" ist bereits vergeben`);
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
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    const updated = await db.member.update({
      where: { id },
      data: updateData,
      include: {
        household: { select: { id: true, name: true } },
        membershipPeriods: {
          orderBy: { joinDate: 'desc' },
        },
      },
    });

    return this.formatMemberResponse(updated);
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
        'Mitglied kann nur geloescht werden, wenn der Status "Ausgetreten" ist'
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
      throw new NotFoundException('Geloeschtes Mitglied nicht gefunden');
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
        'Mitglied kann nicht endgueltig geloescht werden, da Mitgliedschaftszeitraeume existieren'
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
      },
    });

    this.logger.log(`Member ${id} anonymized by user ${userId}`);

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
      membershipType: p.membershipType,
      notes: p.notes ?? null,
      createdAt: toISOStringOrNull(p.createdAt),
      updatedAt: toISOStringOrNull(p.updatedAt),
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
      householdId: member.householdId ?? null,
      householdRole: member.householdRole ?? null,
      household: member.household ?? null,
      membershipPeriods: periods ?? [],
      deletedAt: toISOStringOrNull(member.deletedAt),
      deletedBy: member.deletedBy ?? null,
      deletionReason: member.deletionReason ?? null,
      createdAt: toISOStringOrNull(member.createdAt),
      updatedAt: toISOStringOrNull(member.updatedAt),
    };
  }
}
