import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeeTypeDto } from './dto/create-fee-type.dto.js';
import { UpdateFeeTypeDto } from './dto/update-fee-type.dto.js';
import { UpsertCrossTableEntryDto } from './dto/upsert-cross-table-entry.dto.js';
import { Prisma } from '../../../../prisma/generated/client/index.js';

const { Decimal } = Prisma;

@Injectable()
export class FeeTypesService {
  constructor(private prisma: PrismaService) {}

  // ─── FeeType CRUD ───────────────────────────────────────────────────

  /**
   * List all active, non-deleted fee types for a club.
   * Includes membershipTypeFees relation and member count.
   * Ordered by name ascending.
   */
  async findAll(clubId: string) {
    const db = this.prisma.forClub(clubId);
    const feeTypes = await db.feeType.findMany({
      where: { deletedAt: null },
      include: {
        membershipTypeFees: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });

    return feeTypes.map((ft) => this.serializeFeeType(ft));
  }

  /**
   * Get a single fee type by ID within club scope.
   */
  async findOne(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);
    const feeType = await db.feeType.findFirst({
      where: { id, deletedAt: null },
      include: { membershipTypeFees: true },
    });

    if (!feeType) {
      throw new NotFoundException('Beitragsart nicht gefunden');
    }

    return this.serializeFeeType(feeType);
  }

  /**
   * Create a new fee type.
   * Catches Prisma unique constraint error (P2002) for duplicate name within club.
   */
  async create(clubId: string, dto: CreateFeeTypeDto) {
    const db = this.prisma.forClub(clubId);
    try {
      const feeType = await db.feeType.create({
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
        } as Prisma.FeeTypeUncheckedCreateInput,
      });

      return this.serializeFeeType(feeType);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Eine Beitragsart mit diesem Namen existiert bereits');
      }
      throw error;
    }
  }

  /**
   * Update an existing fee type.
   * Throws NotFoundException if not found or deleted.
   */
  async update(clubId: string, id: string, dto: UpdateFeeTypeDto) {
    const db = this.prisma.forClub(clubId);
    const existing = await db.feeType.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Beitragsart nicht gefunden');
    }

    const feeType = await db.feeType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.serializeFeeType(feeType);
  }

  /**
   * Soft-delete a fee type (CONV-006).
   * Sets deletedAt/deletedBy. Fee type excluded from future findAll.
   * Per D-10: still soft-deletes even when assigned to members.
   */
  async softDelete(clubId: string, id: string, deletedBy: string) {
    const db = this.prisma.forClub(clubId);
    const existing = await db.feeType.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Beitragsart nicht gefunden');
    }

    await db.feeType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  // ─── Cross-Table CRUD ───────────────────────────────────────────────

  /**
   * Return full matrix of MembershipType x FeeType entries for a club.
   * Scoped by feeType.clubId to ensure tenant isolation.
   */
  async findCrossTable(clubId: string) {
    const entries = await this.prisma.membershipTypeFeeType.findMany({
      where: {
        feeType: { clubId, deletedAt: null },
      },
      include: {
        membershipType: { select: { id: true, name: true } },
        feeType: { select: { id: true, name: true } },
      },
    });

    return entries.map((entry) => this.serializeCrossTableEntry(entry));
  }

  /**
   * Upsert a cross-table entry (create or update by membershipTypeId + feeTypeId unique).
   * Amount "0.00" is valid (Beitragsfrei).
   * MembershipTypeFeeType has no clubId; tenant isolation is enforced by verifying
   * both the feeType and membershipType belong to clubId before writing.
   */
  async upsertCrossTableEntry(clubId: string, dto: UpsertCrossTableEntryDto) {
    const [feeType, membershipType] = await Promise.all([
      this.prisma.feeType.findFirst({
        where: { id: dto.feeTypeId, clubId, deletedAt: null },
      }),
      this.prisma.membershipType.findFirst({
        where: { id: dto.membershipTypeId, clubId },
      }),
    ]);

    if (!feeType || !membershipType) {
      throw new NotFoundException('Beitragsart oder Mitgliedsart nicht gefunden');
    }

    const amount = new Decimal(dto.amount);
    const billingInterval = dto.billingInterval ?? 'ANNUALLY';

    const entry = await this.prisma.membershipTypeFeeType.upsert({
      where: {
        membershipTypeId_feeTypeId: {
          membershipTypeId: dto.membershipTypeId,
          feeTypeId: dto.feeTypeId,
        },
      },
      update: {
        amount,
        billingInterval,
      },
      create: {
        membershipTypeId: dto.membershipTypeId,
        feeTypeId: dto.feeTypeId,
        amount,
        billingInterval,
      },
    });

    return this.serializeCrossTableEntry(entry);
  }

  /**
   * Delete a cross-table entry by ID (hard delete — join table, not domain entity).
   * Tenant isolation: verify the entry belongs to clubId via the feeType relation
   * before deleting, since MembershipTypeFeeType has no clubId column.
   */
  async deleteCrossTableEntry(clubId: string, id: string) {
    const entry = await this.prisma.membershipTypeFeeType.findFirst({
      where: { id, feeType: { clubId } },
    });

    if (!entry) {
      throw new NotFoundException('Eintrag nicht gefunden');
    }

    await this.prisma.membershipTypeFeeType.delete({
      where: { id },
    });
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Serialize a fee type record, converting Decimal fields in nested relations.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeFeeType(feeType: any) {
    return {
      ...feeType,
      membershipTypeFees: feeType.membershipTypeFees?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entry: any) => this.serializeCrossTableEntry(entry)
      ),
    };
  }

  /**
   * Serialize a cross-table entry, converting Decimal amount to string.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serializeCrossTableEntry(entry: any) {
    return {
      ...entry,
      amount: entry.amount instanceof Decimal ? entry.amount.toFixed(2) : String(entry.amount),
    };
  }
}
