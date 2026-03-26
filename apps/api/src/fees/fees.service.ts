import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const db = this.prisma.forClub(clubId);
    const category = await db.feeCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        amount: new Decimal(dto.amount),
        billingInterval: dto.billingInterval ?? 'ANNUALLY',
        isOneTime: dto.isOneTime ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return this.serializeCategory(category);
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

    const category = await db.feeCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
        ...(dto.billingInterval !== undefined && { billingInterval: dto.billingInterval }),
        ...(dto.isOneTime !== undefined && { isOneTime: dto.isOneTime }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return this.serializeCategory(category);
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
  private serializeCategory(category: Record<string, unknown>) {
    return {
      ...category,
      amount:
        category.amount instanceof Decimal ? category.amount.toFixed(2) : String(category.amount),
    };
  }

  /**
   * Serialize a member fee override record, converting Decimal fields to strings.
   */
  private serializeOverride(override: Record<string, unknown>) {
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
