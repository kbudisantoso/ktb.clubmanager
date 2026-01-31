import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateTierDto } from './dto/create-tier.dto.js';
import { UpdateTierDto } from './dto/update-tier.dto.js';

/**
 * Service for managing tiers.
 *
 * Tiers define feature limits and flags for clubs:
 * - Limits: users, members, storage
 * - Feature flags: SEPA, reports, bank import
 *
 * Seeded tiers (isSeeded=true) cannot be deleted.
 */
@Injectable()
export class TiersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new tier.
   *
   * @throws BadRequestException if tier name already exists
   */
  async create(dto: CreateTierDto) {
    // Check for duplicate name
    const existing = await this.prisma.tier.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(
        `Tier mit Name "${dto.name}" existiert bereits`,
      );
    }

    return this.prisma.tier.create({
      data: {
        name: dto.name,
        description: dto.description,
        isVisible: dto.isVisible ?? true,
        sortOrder: dto.sortOrder ?? 0,
        color: dto.color,
        icon: dto.icon,
        usersLimit: dto.usersLimit,
        membersLimit: dto.membersLimit,
        storageLimit: dto.storageLimit,
        sepaEnabled: dto.sepaEnabled ?? true,
        reportsEnabled: dto.reportsEnabled ?? true,
        bankImportEnabled: dto.bankImportEnabled ?? true,
      },
    });
  }

  /**
   * Find all tiers with club counts.
   */
  async findAll() {
    return this.prisma.tier.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });
  }

  /**
   * Find a single tier by ID with club count.
   *
   * @throws NotFoundException if tier not found
   */
  async findOne(id: string) {
    const tier = await this.prisma.tier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });

    if (!tier) {
      throw new NotFoundException(`Tier ${id} nicht gefunden`);
    }

    return tier;
  }

  /**
   * Update a tier.
   *
   * @throws NotFoundException if tier not found
   * @throws BadRequestException if new name already exists
   */
  async update(id: string, dto: UpdateTierDto) {
    await this.findOne(id); // Throws if not found

    // Check for duplicate name if changing
    if (dto.name) {
      const existing = await this.prisma.tier.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Tier mit Name "${dto.name}" existiert bereits`,
        );
      }
    }

    return this.prisma.tier.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete a tier.
   *
   * @throws NotFoundException if tier not found
   * @throws BadRequestException if tier is seeded or has clubs
   */
  async remove(id: string) {
    const tier = await this.findOne(id);

    // Cannot delete seeded tiers
    if (tier.isSeeded) {
      throw new BadRequestException(
        'Seeded Tiers können nicht gelöscht werden',
      );
    }

    // Cannot delete if clubs are assigned
    if (tier._count.clubs > 0) {
      throw new BadRequestException(
        `Tier kann nicht gelöscht werden: ${tier._count.clubs} Verein(e) zugewiesen. Bitte zuerst Vereine umziehen.`,
      );
    }

    return this.prisma.tier.delete({
      where: { id },
    });
  }
}
