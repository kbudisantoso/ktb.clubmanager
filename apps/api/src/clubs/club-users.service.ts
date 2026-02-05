import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubRole } from '../../../../prisma/generated/client/index.js';
import {
  isOwner,
  getAssignableRoles,
} from '../common/permissions/club-permissions.js';
import type {
  ClubUserDto,
  UpdateClubUserRolesDto,
} from './dto/update-club-user-roles.dto.js';

@Injectable()
export class ClubUsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all users in a club with their roles.
   */
  async listClubUsers(clubId: string): Promise<ClubUserDto[]> {
    const clubUsers = await this.prisma.clubUser.findMany({
      where: { clubId, status: 'ACTIVE' },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return clubUsers.map((cu) => ({
      id: cu.id,
      userId: cu.userId,
      name: cu.user.name ?? cu.user.email,
      email: cu.user.email,
      image: cu.user.image ?? undefined,
      roles: cu.roles,
      joinedAt: cu.joinedAt,
    }));
  }

  /**
   * Update a user's roles in a club.
   * Enforces business rules:
   * - Users cannot modify their own roles
   * - ADMIN cannot assign OWNER role
   * - Last OWNER cannot be demoted
   */
  async updateClubUserRoles(
    clubId: string,
    targetClubUserId: string,
    actorUserId: string,
    actorRoles: ClubRole[],
    dto: UpdateClubUserRolesDto,
  ): Promise<ClubUserDto> {
    // Find target club user
    const targetClubUser = await this.prisma.clubUser.findUnique({
      where: { id: targetClubUserId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!targetClubUser || targetClubUser.clubId !== clubId) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Rule: Cannot modify own roles
    if (targetClubUser.userId === actorUserId) {
      throw new ForbiddenException('Du kannst deine eigenen Rollen nicht ändern');
    }

    // Rule: Check assignable roles for actor
    const assignableRoles = getAssignableRoles(actorRoles);
    const requestedRoles = dto.roles;

    // Check if actor can assign all requested roles
    for (const role of requestedRoles) {
      if (!assignableRoles.includes(role) && role !== ClubRole.OWNER) {
        throw new ForbiddenException(`Du kannst die Rolle "${role}" nicht zuweisen`);
      }
      // Only OWNER can assign OWNER
      if (role === ClubRole.OWNER && !isOwner(actorRoles)) {
        throw new ForbiddenException('Nur Inhaber können die Inhaber-Rolle zuweisen');
      }
    }

    // Rule: Protect last OWNER
    if (
      targetClubUser.roles.includes(ClubRole.OWNER) &&
      !requestedRoles.includes(ClubRole.OWNER)
    ) {
      const ownerCount = await this.prisma.clubUser.count({
        where: {
          clubId,
          roles: { has: ClubRole.OWNER },
          status: 'ACTIVE',
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Übertrage zuerst die Inhaberschaft an eine andere Person',
        );
      }
    }

    // Update roles
    const updated = await this.prisma.clubUser.update({
      where: { id: targetClubUserId },
      data: { roles: requestedRoles },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.user.name ?? updated.user.email,
      email: updated.user.email,
      image: updated.user.image ?? undefined,
      roles: updated.roles,
      joinedAt: updated.joinedAt,
    };
  }

  /**
   * Remove a user from a club.
   * Enforces: Users cannot remove themselves, last OWNER cannot be removed.
   */
  async removeClubUser(
    clubId: string,
    targetClubUserId: string,
    actorUserId: string,
  ): Promise<void> {
    const targetClubUser = await this.prisma.clubUser.findUnique({
      where: { id: targetClubUserId },
    });

    if (!targetClubUser || targetClubUser.clubId !== clubId) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Cannot remove self (use leave functionality instead)
    if (targetClubUser.userId === actorUserId) {
      throw new ForbiddenException('Du kannst dich nicht selbst entfernen');
    }

    // Protect last OWNER
    if (targetClubUser.roles.includes(ClubRole.OWNER)) {
      const ownerCount = await this.prisma.clubUser.count({
        where: {
          clubId,
          roles: { has: ClubRole.OWNER },
          status: 'ACTIVE',
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Der letzte Inhaber kann nicht entfernt werden',
        );
      }
    }

    // Delete the ClubUser record (user remains in system)
    await this.prisma.clubUser.delete({
      where: { id: targetClubUserId },
    });
  }
}
