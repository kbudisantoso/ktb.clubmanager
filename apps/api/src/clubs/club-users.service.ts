import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubRole } from '../../../../prisma/generated/client/index.js';
import { isOwner, getAssignableRoles } from '../common/permissions/club-permissions.js';
import type { ClubUserDto, UpdateClubUserRolesDto } from './dto/update-club-user-roles.dto.js';

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
   * - Self-edit allowed with restrictions (no privilege escalation, must keep at least one role)
   * - ADMIN cannot assign OWNER role
   * - Last OWNER cannot be demoted
   * - OWNER can only remove own OWNER role if another OWNER exists AND keeps another role
   */
  async updateClubUserRoles(
    clubId: string,
    targetClubUserId: string,
    actorUserId: string,
    actorRoles: ClubRole[],
    dto: UpdateClubUserRolesDto
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

    const isSelfEdit = targetClubUser.userId === actorUserId;
    const requestedRoles = dto.roles;
    const currentRoles = targetClubUser.roles;

    // Rule: Must keep at least one role (use "leave club" to remove completely)
    if (requestedRoles.length === 0) {
      throw new BadRequestException(
        'Mindestens eine Rolle muss zugewiesen sein. Nutze "Club verlassen" um den Club zu verlassen.'
      );
    }

    // Rule: Check assignable roles for actor
    const assignableRoles = getAssignableRoles(actorRoles);

    // Determine added and removed roles
    const addedRoles = requestedRoles.filter((r) => !currentRoles.includes(r));
    const removedRoles = currentRoles.filter((r) => !requestedRoles.includes(r));

    // Check if actor can assign all added roles
    for (const role of addedRoles) {
      if (role === ClubRole.OWNER) {
        // Only OWNER can assign OWNER
        if (!isOwner(actorRoles)) {
          throw new ForbiddenException('Nur Verantwortliche können diese Rolle zuweisen');
        }
        // Self-assigning OWNER is privilege escalation
        if (isSelfEdit) {
          throw new ForbiddenException('Du kannst dir diese Rolle nicht selbst zuweisen');
        }
      } else if (!assignableRoles.includes(role)) {
        throw new ForbiddenException(`Du kannst die Rolle "${role}" nicht zuweisen`);
      }
    }

    // Self-edit specific rules for removing roles
    if (isSelfEdit && removedRoles.length > 0) {
      // Check if removing OWNER role
      if (removedRoles.includes(ClubRole.OWNER)) {
        // Must have another role remaining when removing OWNER
        const remainingRoles = requestedRoles.filter((r) => r !== ClubRole.OWNER);
        if (remainingRoles.length === 0) {
          throw new BadRequestException('Wähle eine andere Rolle bevor du diese Rolle abgibst');
        }
      }
    }

    // Rule: Protect last OWNER (applies to both self-edit and editing others)
    if (currentRoles.includes(ClubRole.OWNER) && !requestedRoles.includes(ClubRole.OWNER)) {
      const ownerCount = await this.prisma.clubUser.count({
        where: {
          clubId,
          roles: { has: ClubRole.OWNER },
          status: 'ACTIVE',
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Übertrage zuerst die Verantwortung an eine andere Person');
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
    actorUserId: string
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
        throw new BadRequestException('Der letzte Verantwortliche kann nicht entfernt werden');
      }
    }

    // Delete the ClubUser record (user remains in system)
    await this.prisma.clubUser.delete({
      where: { id: targetClubUserId },
    });
  }
}
