import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeeCategoryDto } from './dto/create-fee-category.dto.js';
import { UpdateFeeCategoryDto } from './dto/update-fee-category.dto.js';
import { CreateMemberFeeOverrideDto } from './dto/create-member-fee-override.dto.js';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  // ─── Fee Category CRUD ──────────────────────────────────────────────

  /**
   * List all active, non-deleted fee categories for a club.
   * Ordered by sortOrder then name.
   */
  async findAll(clubId: string) {
    const db = this.prisma.forClub(clubId);
    const categories = await db.feeCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        feeCategoryMembershipTypes: true,
      },
    });

    return categories.map((c) => this.serializeCategory(c));
  }

  /**
   * Get a single fee category by ID within club scope.
   */
  async findOne(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);
    const category = await db.feeCategory.findFirst({
      where: { id, deletedAt: null },
      include: {
        feeCategoryMembershipTypes: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Beitragskategorie nicht gefunden');
    }

    return this.serializeCategory(category);
  }

  /**
   * Create a new fee category.
   * Converts amount string to Decimal for storage.
   */
  async create(clubId: string, dto: CreateFeeCategoryDto) {
    // All writes run through `tx` so the category and its join records are
    // committed atomically. `tx` is NOT club-extended, so clubId is injected
    // explicitly via FeeCategoryUncheckedCreateInput.
    const result = await this.prisma.$transaction(async (tx) => {
      const category = await tx.feeCategory.create({
        data: {
          clubId,
          name: dto.name,
          description: dto.description,
          amount: new Decimal(dto.amount),
          billingInterval: dto.billingInterval ?? 'ANNUALLY',
          isOneTime: dto.isOneTime ?? false,
          proRataEligible: dto.proRataEligible ?? false,
          sortOrder: dto.sortOrder ?? 0,
          scope: dto.scope ?? 'ALL_MEMBERS',
        } as Prisma.FeeCategoryUncheckedCreateInput,
      });

      // Create join records for BY_MEMBERSHIP_TYPE scope
      if (dto.scope === 'BY_MEMBERSHIP_TYPE' && dto.membershipTypeIds?.length) {
        await tx.feeCategoryMembershipType.createMany({
          data: dto.membershipTypeIds.map((mtId: string) => ({
            feeCategoryId: category.id,
            membershipTypeId: mtId,
          })),
        });
      }

      // Re-fetch with relations
      return tx.feeCategory.findUnique({
        where: { id: category.id },
        include: { feeCategoryMembershipTypes: true },
      });
    });

    return this.serializeCategory(result);
  }

  /**
   * Update an existing fee category.
   * Throws NotFoundException if not found or deleted.
   */
  async update(clubId: string, id: string, dto: UpdateFeeCategoryDto) {
    const db = this.prisma.forClub(clubId);
    const existing = await db.feeCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Beitragskategorie nicht gefunden');
    }

    // The pre-check findFirst above already enforced club ownership, so an
    // update/find by id inside `tx` is club-safe. All writes run through `tx`
    // so the entity update and join-record rewrite are committed atomically.
    const result = await this.prisma.$transaction(async (tx) => {
      const category = await tx.feeCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
          ...(dto.billingInterval !== undefined && { billingInterval: dto.billingInterval }),
          ...(dto.isOneTime !== undefined && { isOneTime: dto.isOneTime }),
          ...(dto.proRataEligible !== undefined && { proRataEligible: dto.proRataEligible }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.scope !== undefined && { scope: dto.scope }),
        },
      });

      // Update join records if membershipTypeIds is provided
      if (dto.membershipTypeIds !== undefined) {
        // Delete existing join records
        await tx.feeCategoryMembershipType.deleteMany({
          where: { feeCategoryId: id },
        });

        // Create new join records
        if (dto.membershipTypeIds.length > 0) {
          await tx.feeCategoryMembershipType.createMany({
            data: dto.membershipTypeIds.map((mtId: string) => ({
              feeCategoryId: id,
              membershipTypeId: mtId,
            })),
          });
        }
      }

      // Re-fetch with relations
      return tx.feeCategory.findUnique({
        where: { id: category.id },
        include: { feeCategoryMembershipTypes: true },
      });
    });

    return this.serializeCategory(result);
  }

  /**
   * Soft-delete a fee category (CONV-006).
   * Sets deletedAt/deletedBy. Category excluded from future findAll.
   */
  async softDelete(clubId: string, id: string, userId: string) {
    const db = this.prisma.forClub(clubId);
    const existing = await db.feeCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Beitragskategorie nicht gefunden');
    }

    await db.feeCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
  }

  // ─── Member Fee Overrides ───────────────────────────────────────────

  /**
   * Create a per-member fee override.
   * Validates tenant isolation: member must belong to the specified club.
   */
  async createOverride(clubId: string, dto: CreateMemberFeeOverrideDto) {
    await this.validateMemberBelongsToClub(clubId, dto.memberId);

    // Validate the referenced fee category belongs to this club, mirroring the
    // member check. forClub() enforces the tenant scope on the lookup.
    if (dto.feeCategoryId) {
      const feeCategory = await this.prisma.forClub(clubId).feeCategory.findFirst({
        where: { id: dto.feeCategoryId, deletedAt: null },
      });
      if (!feeCategory) {
        throw new BadRequestException(
          'Die gewählte Beitragskategorie gehört nicht zu diesem Verein'
        );
      }
    }

    // Tenant-safe: memberId is validated via validateMemberBelongsToClub above
    // and feeCategoryId is validated against the club scope above, so this
    // unscoped-model write cannot cross tenant boundaries.
    const override = await this.prisma.memberFeeOverride.create({
      data: {
        memberId: dto.memberId,
        feeCategoryId: dto.feeCategoryId,
        overrideType: dto.overrideType,
        customAmount: dto.customAmount ? new Decimal(dto.customAmount) : undefined,
        reason: dto.reason,
        isBaseFee: dto.isBaseFee ?? false,
      },
    });

    return this.serializeOverride(override);
  }

  /**
   * Find all overrides for a specific member.
   * Validates tenant isolation: member must belong to the specified club.
   */
  async findOverridesForMember(clubId: string, memberId: string) {
    await this.validateMemberBelongsToClub(clubId, memberId);

    // Tenant-safe: memberId is validated via validateMemberBelongsToClub above,
    // so this unscoped-model query only returns overrides for an in-club member.
    const overrides = await this.prisma.memberFeeOverride.findMany({
      where: { memberId },
      include: { feeCategory: true },
    });

    return overrides.map((o) => this.serializeOverride(o));
  }

  /**
   * Delete a member fee override (hard delete).
   * Validates tenant isolation: override's member must belong to the specified club.
   */
  async deleteOverride(clubId: string, overrideId: string) {
    // Tenant-safe: the unscoped lookup loads the override's member relation, and
    // the member.clubId check below rejects any override outside this club
    // before the delete runs.
    const override = await this.prisma.memberFeeOverride.findFirst({
      where: { id: overrideId },
      include: { member: true },
    });

    if (!override) {
      throw new NotFoundException('Override nicht gefunden');
    }

    if (override.member.clubId !== clubId) {
      throw new ForbiddenException('Zugriff verweigert: Mitglied gehoert nicht zu diesem Verein');
    }

    await this.prisma.memberFeeOverride.delete({
      where: { id: overrideId },
    });
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Validate that a member belongs to the specified club.
   * Throws ForbiddenException if the member is not found in this club.
   */
  private async validateMemberBelongsToClub(clubId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId },
    });

    if (!member) {
      throw new ForbiddenException('Zugriff verweigert: Mitglied gehoert nicht zu diesem Verein');
    }
  }

  /**
   * Serialize a fee category record, converting Decimal fields to strings.
   * (Pitfall 1 from RESEARCH.md)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeCategory(category: any) {
    const { feeCategoryMembershipTypes, ...rest } = category ?? {};
    return {
      ...rest,
      amount:
        category.amount instanceof Decimal ? category.amount.toFixed(2) : String(category.amount),
      scope: category.scope ?? 'ALL_MEMBERS',
      membershipTypes: feeCategoryMembershipTypes ?? [],
    };
  }

  /**
   * Serialize a member fee override record, converting Decimal fields to strings.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeOverride(override: any) {
    const customAmount = override.customAmount;
    return {
      ...override,
      customAmount:
        customAmount === null || customAmount === undefined
          ? customAmount
          : customAmount instanceof Decimal
            ? customAmount.toFixed(2)
            : String(customAmount),
    };
  }
}
