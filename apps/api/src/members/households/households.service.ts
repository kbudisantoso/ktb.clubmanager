import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateHouseholdDto } from './dto/create-household.dto.js';
import type { UpdateHouseholdDto } from './dto/update-household.dto.js';

@Injectable()
export class HouseholdsService {
  private readonly logger = new Logger(HouseholdsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * List all households for a club with member count.
   */
  async findAll(clubId: string) {
    const db = this.prisma.forClub(clubId);

    const households = await db.household.findMany({
      where: { deletedAt: null },
      include: {
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
      orderBy: { name: 'asc' },
    });

    return households.map((h) => ({
      id: h.id,
      clubId: h.clubId,
      name: h.name,
      primaryContactId: h.primaryContactId,
      memberCount: h.members.length,
      members: h.members,
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }));
  }

  /**
   * Get a single household with all members and their roles.
   */
  async findOne(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);

    const household = await db.household.findFirst({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            householdRole: true,
            memberNumber: true,
            email: true,
            phone: true,
            mobile: true,
            street: true,
            houseNumber: true,
            addressExtra: true,
            postalCode: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!household) {
      throw new NotFoundException('Haushalt nicht gefunden');
    }

    return {
      id: household.id,
      clubId: household.clubId,
      name: household.name,
      primaryContactId: household.primaryContactId,
      memberCount: household.members.length,
      members: household.members,
      createdAt: household.createdAt.toISOString(),
      updatedAt: household.updatedAt.toISOString(),
    };
  }

  /**
   * Create a household and assign members with roles.
   */
  async create(clubId: string, dto: CreateHouseholdDto, userId: string) {
    const db = this.prisma.forClub(clubId);

    // Validate primaryContactId is in memberIds
    if (dto.primaryContactId && !dto.memberIds.includes(dto.primaryContactId)) {
      throw new BadRequestException('Hauptkontakt muss einer der zugeordneten Mitglieder sein');
    }

    // Validate all members exist and belong to this club
    const members = await db.member.findMany({
      where: {
        id: { in: dto.memberIds },
        deletedAt: null,
      },
    });

    if (members.length !== dto.memberIds.length) {
      throw new BadRequestException('Ein oder mehrere Mitglieder wurden nicht gefunden');
    }

    // Create household
    const household = await this.prisma.household.create({
      data: {
        clubId,
        name: dto.name,
        primaryContactId: dto.primaryContactId,
      },
    });

    // Update each member with household assignment and role
    for (const memberId of dto.memberIds) {
      const role = dto.roles[memberId] ?? 'OTHER';
      await db.member.update({
        where: { id: memberId },
        data: {
          householdId: household.id,
          householdRole: role,
        },
      });
    }

    this.logger.log(
      `Household ${household.id} created with ${dto.memberIds.length} members by ${userId}`
    );

    return this.findOne(clubId, household.id);
  }

  /**
   * Update household name and/or primary contact.
   */
  async update(clubId: string, id: string, dto: UpdateHouseholdDto) {
    const db = this.prisma.forClub(clubId);

    const household = await db.household.findFirst({
      where: { id, deletedAt: null },
    });

    if (!household) {
      throw new NotFoundException('Haushalt nicht gefunden');
    }

    // If setting primaryContactId, validate it's a member of this household
    if (dto.primaryContactId) {
      const member = await db.member.findFirst({
        where: {
          id: dto.primaryContactId,
          householdId: id,
          deletedAt: null,
        },
      });

      if (!member) {
        throw new BadRequestException('Hauptkontakt muss ein Mitglied dieses Haushalts sein');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.primaryContactId !== undefined) updateData.primaryContactId = dto.primaryContactId;

    await db.household.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(clubId, id);
  }

  /**
   * Add a member to a household with a role.
   */
  async addMember(clubId: string, householdId: string, memberId: string, role: string) {
    const db = this.prisma.forClub(clubId);

    // Validate household exists
    const household = await db.household.findFirst({
      where: { id: householdId, deletedAt: null },
    });

    if (!household) {
      throw new NotFoundException('Haushalt nicht gefunden');
    }

    // Validate member exists
    const member = await db.member.findFirst({
      where: { id: memberId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht gefunden');
    }

    // Warn if member is already in a different household
    if (member.householdId && member.householdId !== householdId) {
      this.logger.warn(
        `Member ${memberId} is being transferred from household ${member.householdId} to ${householdId}`
      );
    }

    await db.member.update({
      where: { id: memberId },
      data: {
        householdId,
        householdRole: role as 'HEAD' | 'SPOUSE' | 'CHILD' | 'OTHER',
      },
    });

    return this.findOne(clubId, householdId);
  }

  /**
   * Remove a member from a household.
   * Cannot remove HEAD without reassigning first.
   * If no members remain, soft-delete the household.
   */
  async removeMember(clubId: string, householdId: string, memberId: string, userId: string) {
    const db = this.prisma.forClub(clubId);

    const member = await db.member.findFirst({
      where: { id: memberId, householdId, deletedAt: null },
    });

    if (!member) {
      throw new NotFoundException('Mitglied nicht in diesem Haushalt gefunden');
    }

    if (member.householdRole === 'HEAD') {
      throw new BadRequestException(
        'HEAD kann nicht entfernt werden ohne Neuzuweisung. Bitte zuerst einen neuen HEAD bestimmen.'
      );
    }

    // Clear household assignment
    await db.member.update({
      where: { id: memberId },
      data: {
        householdId: null,
        householdRole: null,
      },
    });

    // Check if any members remain
    const remainingMembers = await db.member.count({
      where: { householdId, deletedAt: null },
    });

    if (remainingMembers === 0) {
      // Soft-delete the empty household
      await db.household.update({
        where: { id: householdId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      this.logger.log(`Household ${householdId} soft-deleted (no remaining members) by ${userId}`);

      return { dissolved: true };
    }

    return this.findOne(clubId, householdId);
  }

  /**
   * Dissolve a household: clear all member assignments and soft-delete.
   */
  async dissolve(clubId: string, householdId: string, userId: string) {
    const db = this.prisma.forClub(clubId);

    const household = await db.household.findFirst({
      where: { id: householdId, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    if (!household) {
      throw new NotFoundException('Haushalt nicht gefunden');
    }

    // Clear all member assignments
    for (const member of household.members) {
      await db.member.update({
        where: { id: member.id },
        data: {
          householdId: null,
          householdRole: null,
        },
      });
    }

    // Soft-delete household
    await db.household.update({
      where: { id: householdId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    this.logger.log(
      `Household ${householdId} dissolved (${household.members.length} members cleared) by ${userId}`
    );

    return { dissolved: true };
  }

  /**
   * Sync addresses: copy address fields from source member to target members.
   * This is explicit - never silent.
   */
  async syncAddresses(
    clubId: string,
    householdId: string,
    sourceMemberId: string,
    targetMemberIds: string[]
  ) {
    const db = this.prisma.forClub(clubId);

    // Validate source member belongs to this household
    const source = await db.member.findFirst({
      where: { id: sourceMemberId, householdId, deletedAt: null },
    });

    if (!source) {
      throw new NotFoundException('Quellmitglied nicht in diesem Haushalt gefunden');
    }

    // Validate all target members belong to this household
    const targets = await db.member.findMany({
      where: {
        id: { in: targetMemberIds },
        householdId,
        deletedAt: null,
      },
    });

    if (targets.length !== targetMemberIds.length) {
      throw new BadRequestException(
        'Ein oder mehrere Zielmitglieder sind nicht in diesem Haushalt'
      );
    }

    const addressData = {
      street: source.street,
      houseNumber: source.houseNumber,
      addressExtra: source.addressExtra,
      postalCode: source.postalCode,
      city: source.city,
      country: source.country,
    };

    const updatedIds: string[] = [];
    for (const targetId of targetMemberIds) {
      await db.member.update({
        where: { id: targetId },
        data: addressData,
      });
      updatedIds.push(targetId);
    }

    this.logger.log(
      `Address synced from member ${sourceMemberId} to ${updatedIds.length} members in household ${householdId}`
    );

    return { updatedMemberIds: updatedIds };
  }
}
