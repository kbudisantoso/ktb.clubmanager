import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNumberRangeDto } from './dto/create-number-range.dto.js';
import { UpdateNumberRangeDto } from './dto/update-number-range.dto.js';

@Injectable()
export class NumberRangesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all number ranges for a club, ordered by entityType.
   */
  async findAll(clubId: string) {
    const db = this.prisma.forClub(clubId);
    return db.numberRange.findMany({
      orderBy: { entityType: 'asc' },
    });
  }

  /**
   * Get a single number range by ID.
   */
  async findOne(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);
    const range = await db.numberRange.findFirst({
      where: { id },
    });

    if (!range) {
      throw new NotFoundException('Nummernkreis nicht gefunden');
    }

    return range;
  }

  /**
   * Find a number range by entity type (convenience for other services).
   */
  async findByEntityType(clubId: string, entityType: string) {
    const db = this.prisma.forClub(clubId);
    return db.numberRange.findFirst({
      where: { entityType },
    });
  }

  /**
   * Create a new number range. Checks for duplicate entityType per club.
   */
  async create(clubId: string, dto: CreateNumberRangeDto) {
    const db = this.prisma.forClub(clubId);

    // Check for duplicate entityType
    const existing = await db.numberRange.findFirst({
      where: { entityType: dto.entityType },
    });

    if (existing) {
      throw new ConflictException(
        `Nummernkreis fuer Typ "${dto.entityType}" existiert bereits`
      );
    }

    // Use raw prisma with explicit clubId (forClub extension adds clubId
    // at runtime but TypeScript requires either club relation or clubId)
    return this.prisma.numberRange.create({
      data: {
        clubId,
        entityType: dto.entityType,
        prefix: dto.prefix ?? '',
        padLength: dto.padLength ?? 4,
        yearReset: dto.yearReset ?? false,
      },
    });
  }

  /**
   * Update number range configuration.
   * Does NOT allow updating entityType or currentValue.
   */
  async update(clubId: string, id: string, dto: UpdateNumberRangeDto) {
    const db = this.prisma.forClub(clubId);

    // Verify range exists
    const existing = await db.numberRange.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Nummernkreis nicht gefunden');
    }

    return db.numberRange.update({
      where: { id },
      data: {
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
        ...(dto.padLength !== undefined && { padLength: dto.padLength }),
        ...(dto.yearReset !== undefined && { yearReset: dto.yearReset }),
      },
    });
  }

  /**
   * Delete a number range.
   * Throws if numbers have already been generated (currentValue > 0).
   */
  async delete(clubId: string, id: string) {
    const db = this.prisma.forClub(clubId);

    const existing = await db.numberRange.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Nummernkreis nicht gefunden');
    }

    if (existing.currentValue > 0) {
      throw new BadRequestException(
        'Nummernkreis kann nicht geloescht werden, da bereits Nummern vergeben wurden'
      );
    }

    await db.numberRange.delete({
      where: { id },
    });
  }

  /**
   * Atomically increment the counter and return a formatted number.
   *
   * Uses $transaction for atomic increment to prevent duplicate numbers
   * under concurrent requests. Does NOT use prisma.forClub() because
   * $transaction operates on the raw Prisma client.
   *
   * Resolves {YYYY} in prefix to current year.
   * Zero-pads currentValue to padLength.
   *
   * @returns Formatted number string (e.g., "M-0042", "TSV-2026-001")
   */
  async generateNext(clubId: string, entityType: string): Promise<string> {
    const range = await this.prisma.$transaction(async (tx) => {
      // Find the range within transaction
      const current = await tx.numberRange.findFirst({
        where: { clubId, entityType },
      });

      if (!current) {
        throw new NotFoundException(
          `Nummernkreis fuer Typ "${entityType}" nicht gefunden`
        );
      }

      // Handle year reset: if yearReset is true and prefix contains {YYYY},
      // check if the current year differs from what's stored.
      // We detect year change by checking if the resolved prefix year differs.
      let resetValue = false;
      if (current.yearReset && current.prefix.includes('{YYYY}')) {
        const currentYear = new Date().getFullYear().toString();
        // If currentValue > 0, check if we need to reset
        // We store the year implicitly in the prefix pattern usage
        // A simple approach: reset if the number has been used before
        // and the updatedAt year differs from current year
        if (current.currentValue > 0) {
          const lastUpdateYear = current.updatedAt.getFullYear().toString();
          if (lastUpdateYear !== currentYear) {
            resetValue = true;
          }
        }
      }

      // Atomic increment (or reset + set to 1)
      const updated = await tx.numberRange.update({
        where: { id: current.id },
        data: {
          currentValue: resetValue ? 1 : { increment: 1 },
        },
      });

      return updated;
    });

    return this.formatNumber(range.prefix, range.currentValue, range.padLength);
  }

  /**
   * Preview what the next number would look like without actually generating it.
   */
  previewNext(prefix: string, currentValue: number, padLength: number): string {
    return this.formatNumber(prefix, currentValue + 1, padLength);
  }

  /**
   * Ensure a default number range exists for a given entity type.
   * Called during member creation to auto-create the MEMBER range if missing.
   *
   * Default for MEMBER: prefix="", padLength=4
   */
  async ensureDefaultExists(clubId: string, entityType: string) {
    const db = this.prisma.forClub(clubId);

    const existing = await db.numberRange.findFirst({
      where: { entityType },
    });

    if (existing) {
      return existing;
    }

    // Use raw prisma with explicit clubId for type safety
    return this.prisma.numberRange.create({
      data: {
        clubId,
        entityType,
        prefix: '',
        padLength: 4,
        yearReset: false,
      },
    });
  }

  /**
   * Format a number with prefix resolution and zero-padding.
   */
  private formatNumber(prefix: string, value: number, padLength: number): string {
    let resolvedPrefix = prefix;
    if (resolvedPrefix.includes('{YYYY}')) {
      resolvedPrefix = resolvedPrefix.replace(
        '{YYYY}',
        new Date().getFullYear().toString()
      );
    }

    const paddedValue = String(value).padStart(padLength, '0');
    return `${resolvedPrefix}${paddedValue}`;
  }
}
