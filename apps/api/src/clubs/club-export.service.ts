import { Injectable, NotFoundException } from '@nestjs/common';
import yaml from 'js-yaml';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ClubExportData,
  ExportClub,
  ExportHousehold,
  ExportMember,
  ExportMembershipType,
  ExportNumberRange,
  ExportUser,
} from '../../../../prisma/scripts/lib/types.js';

@Injectable()
export class ClubExportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export all club data as a YAML string.
   * Password hashes are excluded for security (API context).
   */
  async exportClub(clubId: string, slug: string): Promise<string> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Club "${slug}" nicht gefunden`);
    }

    const [clubUsers, membershipTypes, numberRanges, members, households] = await Promise.all([
      this.prisma.clubUser.findMany({
        where: { clubId: club.id },
        include: { user: true },
      }),
      this.prisma.membershipType.findMany({
        where: { clubId: club.id },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.numberRange.findMany({
        where: { clubId: club.id },
      }),
      this.prisma.member.findMany({
        where: { clubId: club.id, deletedAt: null },
        include: {
          membershipPeriods: {
            include: { membershipType: true },
            orderBy: { joinDate: 'asc' },
          },
          household: true,
        },
        orderBy: { memberNumber: 'asc' },
      }),
      this.prisma.household.findMany({
        where: { clubId: club.id, deletedAt: null },
        include: {
          members: {
            where: { deletedAt: null },
            select: { memberNumber: true, id: true },
          },
        },
      }),
    ]);

    // Build lookup maps
    const memberById = new Map(members.map((m) => [m.id, m]));
    const userById = new Map(clubUsers.map((cu) => [cu.user.id, cu.user]));
    const membershipTypeById = new Map(membershipTypes.map((mt) => [mt.id, mt]));

    // Transform club
    const exportClub: ExportClub = stripUndefined({
      name: club.name,
      slug: club.slug,
      legalName: club.legalName ?? undefined,
      shortCode: club.shortCode ?? undefined,
      description: club.description ?? undefined,
      visibility: club.visibility,
      avatarColor: club.avatarColor ?? undefined,
      foundedAt: club.foundedAt ? formatDate(club.foundedAt) : undefined,
      street: club.street ?? undefined,
      houseNumber: club.houseNumber ?? undefined,
      postalCode: club.postalCode ?? undefined,
      city: club.city ?? undefined,
      phone: club.phone ?? undefined,
      email: club.email ?? undefined,
      website: club.website ?? undefined,
      isRegistered: club.isRegistered,
      registryCourt: club.registryCourt ?? undefined,
      registryNumber: club.registryNumber ?? undefined,
      clubPurpose: club.clubPurpose ?? undefined,
      clubSpecialForm: club.clubSpecialForm ?? undefined,
      taxNumber: club.taxNumber ?? undefined,
      vatId: club.vatId ?? undefined,
      taxOffice: club.taxOffice ?? undefined,
      isNonProfit: club.isNonProfit,
      iban: club.iban ?? undefined,
      bic: club.bic ?? undefined,
      bankName: club.bankName ?? undefined,
      accountHolder: club.accountHolder ?? undefined,
      inviteCode: club.inviteCode ?? undefined,
      fiscalYearStartMonth: club.fiscalYearStartMonth ?? undefined,
      probationPeriodDays: club.probationPeriodDays ?? undefined,
    });

    // Transform users (NO passwordHash for API security)
    const exportUsers: ExportUser[] = clubUsers.map((cu) =>
      stripUndefined({
        email: cu.user.email,
        name: cu.user.name ?? cu.user.email,
        isSuperAdmin: cu.user.isSuperAdmin,
        locale: cu.user.locale ?? undefined,
        clubRoles: cu.roles,
        clubStatus: cu.status,
        isExternal: cu.isExternal,
      })
    );

    // Transform membership types (always include boolean fields for clarity)
    const exportMembershipTypes: ExportMembershipType[] = membershipTypes.map((mt) =>
      stripUndefined({
        name: mt.name,
        code: mt.code,
        description: mt.description ?? undefined,
        isDefault: mt.isDefault,
        sortOrder: mt.sortOrder,
        isActive: mt.isActive,
        vote: mt.vote,
        assemblyAttendance: mt.assemblyAttendance,
        eligibleForOffice: mt.eligibleForOffice,
        color: mt.color,
      })
    );

    // Transform number ranges (always include all fields)
    const exportNumberRanges: ExportNumberRange[] = numberRanges.map((nr) =>
      stripUndefined({
        entityType: nr.entityType,
        prefix: nr.prefix || undefined,
        currentValue: nr.currentValue,
        padLength: nr.padLength,
        yearReset: nr.yearReset,
        lastResetYear: nr.lastResetYear ?? undefined,
      })
    );

    // Transform households
    const exportHouseholds: ExportHousehold[] = households.map((h) => {
      const primaryMember = h.primaryContactId ? memberById.get(h.primaryContactId) : undefined;
      return stripUndefined({
        name: h.name,
        primaryContactMemberNumber: primaryMember?.memberNumber ?? undefined,
      });
    });

    // Transform members
    const exportMembers: ExportMember[] = members.map((m) => {
      const user = m.userId ? userById.get(m.userId) : undefined;
      const firstPeriod = m.membershipPeriods[0];
      const membershipType = firstPeriod?.membershipTypeId
        ? membershipTypeById.get(firstPeriod.membershipTypeId)
        : undefined;

      return stripUndefined({
        memberNumber: m.memberNumber,
        firstName: m.firstName,
        lastName: m.lastName,
        personType: m.personType !== 'NATURAL' ? m.personType : undefined,
        salutation: m.salutation ?? undefined,
        title: m.title ?? undefined,
        nickname: m.nickname ?? undefined,
        organizationName: m.organizationName ?? undefined,
        contactFirstName: m.contactFirstName ?? undefined,
        contactLastName: m.contactLastName ?? undefined,
        department: m.department ?? undefined,
        position: m.position ?? undefined,
        vatId: m.vatId ?? undefined,
        street: m.street ?? undefined,
        houseNumber: m.houseNumber ?? undefined,
        addressExtra: m.addressExtra ?? undefined,
        postalCode: m.postalCode ?? undefined,
        city: m.city ?? undefined,
        country: m.country !== 'DE' ? m.country : undefined,
        email: m.email ?? undefined,
        phone: m.phone ?? undefined,
        mobile: m.mobile ?? undefined,
        notes: m.notes ?? undefined,
        status: m.status,
        cancellationDate: m.cancellationDate ? formatDate(m.cancellationDate) : undefined,
        cancellationReceivedAt: m.cancellationReceivedAt
          ? formatDate(m.cancellationReceivedAt)
          : undefined,
        statusChangeReason: m.statusChangeReason ?? undefined,
        joinDate: firstPeriod ? formatDate(firstPeriod.joinDate) : undefined,
        membershipTypeCode: membershipType?.code ?? undefined,
        userEmail: user?.email ?? undefined,
        householdName: m.household?.name ?? undefined,
        householdRole: m.householdRole ?? undefined,
      });
    });

    // Assemble export data
    const data: ClubExportData = {
      meta: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        slug: club.slug,
      },
      club: exportClub,
      ...(exportUsers.length > 0 && { users: exportUsers }),
      ...(exportMembershipTypes.length > 0 && { membershipTypes: exportMembershipTypes }),
      ...(exportNumberRanges.length > 0 && { numberRanges: exportNumberRanges }),
      ...(exportHouseholds.length > 0 && { households: exportHouseholds }),
      ...(exportMembers.length > 0 && { members: exportMembers }),
    };

    return yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
