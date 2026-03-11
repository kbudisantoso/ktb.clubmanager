import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto.js';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto.js';

@Injectable()
export class MembershipTypesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all membership types for a club, ordered by sortOrder then name.
   */
  async findAll(clubId: string) {
    return this.prisma.membershipType.findMany({
      where: { clubId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a single membership type by ID within club scope.
   */
  async findOne(clubId: string, id: string) {
    const type = await this.prisma.membershipType.findFirst({
      where: { id, clubId },
    });

    if (!type) {
      throw new NotFoundException('Mitgliedsart nicht gefunden');
    }

    return type;
  }

  /**
   * Create a new membership type.
   * If isDefault=true, unsets any existing default first.
   */
  async create(clubId: string, dto: CreateMembershipTypeDto) {
    // Check for duplicate code within club
    const existing = await this.prisma.membershipType.findFirst({
      where: { code: dto.code, clubId },
    });

    if (existing) {
      throw new ConflictException(`Mitgliedsart mit Code "${dto.code}" existiert bereits`);
    }

    // If setting as default, unset existing default first
    if (dto.isDefault) {
      await this.prisma.membershipType.updateMany({
        where: { clubId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.membershipType.create({
      data: {
        clubId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        vote: dto.vote ?? true,
        assemblyAttendance: dto.assemblyAttendance ?? true,
        eligibleForOffice: dto.eligibleForOffice ?? true,
        ...(dto.color && { color: dto.color as never }),
      },
    });
  }

  /**
   * Update a membership type.
   * If setting isDefault=true, unsets existing default in a transaction.
   */
  async update(clubId: string, id: string, dto: UpdateMembershipTypeDto) {
    const existing = await this.prisma.membershipType.findFirst({
      where: { id, clubId },
    });

    if (!existing) {
      throw new NotFoundException('Mitgliedsart nicht gefunden');
    }

    // If updating code, check for duplicate
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.prisma.membershipType.findFirst({
        where: { code: dto.code, clubId },
      });
      if (duplicate) {
        throw new ConflictException(`Mitgliedsart mit Code "${dto.code}" existiert bereits`);
      }
    }

    // If setting as default, use transaction to unset others first
    if (dto.isDefault === true && !existing.isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.membershipType.updateMany({
          where: { clubId, isDefault: true },
          data: { isDefault: false },
        });

        return tx.membershipType.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.code !== undefined && { code: dto.code }),
            ...(dto.description !== undefined && { description: dto.description }),
            isDefault: true,
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            ...(dto.vote !== undefined && { vote: dto.vote }),
            ...(dto.assemblyAttendance !== undefined && {
              assemblyAttendance: dto.assemblyAttendance,
            }),
            ...(dto.eligibleForOffice !== undefined && {
              eligibleForOffice: dto.eligibleForOffice,
            }),
            ...(dto.color !== undefined && { color: dto.color as never }),
          },
        });
      });
    }

    return this.prisma.membershipType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.vote !== undefined && { vote: dto.vote }),
        ...(dto.assemblyAttendance !== undefined && {
          assemblyAttendance: dto.assemblyAttendance,
        }),
        ...(dto.eligibleForOffice !== undefined && { eligibleForOffice: dto.eligibleForOffice }),
        ...(dto.color !== undefined && { color: dto.color as never }),
      },
    });
  }

  /**
   * Delete a membership type.
   * Throws BadRequestException if any MembershipPeriod references this type.
   */
  async remove(clubId: string, id: string) {
    const existing = await this.prisma.membershipType.findFirst({
      where: { id, clubId },
    });

    if (!existing) {
      throw new NotFoundException('Mitgliedsart nicht gefunden');
    }

    // Check if any membership periods reference this type
    const periodCount = await this.prisma.membershipPeriod.count({
      where: { membershipTypeId: id },
    });

    if (periodCount > 0) {
      throw new BadRequestException(
        'Mitgliedsart kann nicht geloescht werden, da sie von Mitgliedschaften verwendet wird'
      );
    }

    await this.prisma.membershipType.delete({
      where: { id },
    });
  }

  /**
   * Seed default membership types for a new club.
   * Creates 5 standard German club membership types.
   */
  async seedDefaults(clubId: string) {
    const defaults = [
      {
        name: 'Ordentliches Mitglied',
        code: 'ORDENTLICH',
        description: 'Vollmitglied mit allen Rechten und Pflichten',
        isDefault: true,
        sortOrder: 0,
        isActive: true,
        vote: true,
        assemblyAttendance: true,
        eligibleForOffice: true,
        color: 'BLUE' as never,
      },
      {
        name: 'Passives Mitglied',
        code: 'PASSIV',
        description: 'Mitglied ohne aktive Teilnahme',
        isDefault: false,
        sortOrder: 1,
        isActive: true,
        vote: false,
        assemblyAttendance: true,
        eligibleForOffice: false,
        color: 'SLATE' as never,
      },
      {
        name: 'Ehrenmitglied',
        code: 'EHREN',
        description: 'Ehrenmitglied (in der Regel beitragsfrei)',
        isDefault: false,
        sortOrder: 2,
        isActive: true,
        vote: true,
        assemblyAttendance: true,
        eligibleForOffice: false,
        color: 'PURPLE' as never,
      },
      {
        name: 'Foerdermitglied',
        code: 'FOERDER',
        description: 'Unterstuetzendes Mitglied (nur finanzielle Foerderung)',
        isDefault: false,
        sortOrder: 3,
        isActive: true,
        vote: false,
        assemblyAttendance: false,
        eligibleForOffice: false,
        color: 'GREEN' as never,
      },
      {
        name: 'Jugendmitglied',
        code: 'JUGEND',
        description: 'Jugendmitglied (altersabhaengig)',
        isDefault: false,
        sortOrder: 4,
        isActive: true,
        vote: false,
        assemblyAttendance: true,
        eligibleForOffice: false,
        color: 'AMBER' as never,
      },
    ];

    await this.prisma.membershipType.createMany({
      data: defaults.map((d) => ({ ...d, clubId })),
    });
  }
}
