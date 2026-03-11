import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClubRole, ClubUserStatus } from '../../../../prisma/generated/client/index.js';
import { isOwner, getAssignableRoles } from '../common/permissions/club-permissions.js';
import type { ClubUserDto, UpdateClubUserRolesDto } from './dto/update-club-user-roles.dto.js';

export interface UnlinkedUserDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  roles: ClubRole[];
  isExternal: boolean;
  joinedAt: Date;
}

export interface ClubUserDetailDto extends ClubUserDto {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string | null;
  } | null;
}

export interface ListClubUsersOptions {
  search?: string;
  status?: ClubUserStatus[];
  roles?: ClubRole[];
}

@Injectable()
export class ClubUsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map a ClubUser with included user to ClubUserDto.
   */
  private mapToDto(cu: {
    id: string;
    userId: string;
    roles: ClubRole[];
    status: ClubUserStatus;
    joinedAt: Date;
    isExternal: boolean;
    user: { id: string; name: string | null; email: string; image: string | null };
  }): ClubUserDto {
    return {
      id: cu.id,
      userId: cu.userId,
      name: cu.user.name ?? cu.user.email,
      email: cu.user.email,
      image: cu.user.image ?? undefined,
      roles: cu.roles,
      status: cu.status,
      joinedAt: cu.joinedAt,
      isExternal: cu.isExternal,
    };
  }

  /**
   * List all users in a club with their roles.
   * Supports optional filters: search, status, roles.
   */
  async listClubUsers(clubId: string, options: ListClubUsersOptions = {}): Promise<ClubUserDto[]> {
    const { search, status, roles } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { clubId, deletedAt: null };

    // Filter by status (default: all non-deleted)
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // Filter by roles (has any of the specified roles)
    if (roles && roles.length > 0) {
      where.roles = { hasSome: roles };
    }

    // Search by name or email
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const clubUsers = await this.prisma.clubUser.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return clubUsers.map((cu) => this.mapToDto(cu));
  }

  /**
   * Get a single club user with detailed info including member-link.
   */
  async getClubUserDetail(clubId: string, clubUserId: string): Promise<ClubUserDetailDto> {
    const clubUser = await this.prisma.clubUser.findUnique({
      where: { id: clubUserId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!clubUser || clubUser.clubId !== clubId || clubUser.deletedAt) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Look up linked member
    const member = await this.prisma.member.findFirst({
      where: { clubId, userId: clubUser.userId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, memberNumber: true },
    });

    return {
      ...this.mapToDto(clubUser),
      member: member
        ? {
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
            memberNumber: member.memberNumber,
          }
        : null,
    };
  }

  /**
   * Update a club user's status (suspend/reactivate).
   * Enforces: self-action protection, last OWNER protection, valid transitions.
   */
  async updateClubUserStatus(
    clubId: string,
    targetClubUserId: string,
    actorUserId: string,
    newStatus: ClubUserStatus
  ): Promise<ClubUserDto> {
    // Only ACTIVE <-> SUSPENDED transitions allowed
    if (newStatus === ClubUserStatus.PENDING) {
      throw new BadRequestException('Status kann nicht auf PENDING gesetzt werden');
    }

    const targetClubUser = await this.prisma.clubUser.findUnique({
      where: { id: targetClubUserId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!targetClubUser || targetClubUser.clubId !== clubId || targetClubUser.deletedAt) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    // Self-action protection
    if (targetClubUser.userId === actorUserId) {
      throw new ForbiddenException('Du kannst deinen eigenen Status nicht ändern');
    }

    // Cannot change status of PENDING users (they need to accept invite)
    if (targetClubUser.status === ClubUserStatus.PENDING) {
      throw new BadRequestException(
        'Der Status eines eingeladenen Benutzers kann nicht geändert werden'
      );
    }

    // Last OWNER protection when suspending
    if (newStatus === ClubUserStatus.SUSPENDED && targetClubUser.roles.includes(ClubRole.OWNER)) {
      const ownerCount = await this.prisma.clubUser.count({
        where: {
          clubId,
          roles: { has: ClubRole.OWNER },
          status: 'ACTIVE',
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Der letzte Verantwortliche kann nicht gesperrt werden');
      }
    }

    const updated = await this.prisma.clubUser.update({
      where: { id: targetClubUserId },
      data: { status: newStatus },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Invite a user to a club by email.
   * The user must already be registered. Creates a PENDING ClubUser.
   */
  async inviteUser(
    clubId: string,
    email: string,
    roles: ClubRole[],
    invitedById: string
  ): Promise<ClubUserDto> {
    // Look up user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!user) {
      throw new BadRequestException(
        'Kein Benutzer mit dieser E-Mail-Adresse gefunden. Der Benutzer muss sich zuerst registrieren.'
      );
    }

    // Check if user already has an active ClubUser for this club
    const existing = await this.prisma.clubUser.findFirst({
      where: { userId: user.id, clubId, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException('Dieser Benutzer ist bereits Mitglied dieses Vereins.');
    }

    const clubUser = await this.prisma.clubUser.create({
      data: {
        userId: user.id,
        clubId,
        roles,
        status: ClubUserStatus.PENDING,
        invitedById,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return this.mapToDto(clubUser);
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

    if (!targetClubUser || targetClubUser.clubId !== clubId || targetClubUser.deletedAt) {
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

    return this.mapToDto(updated);
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

    // Soft-delete the ClubUser record (user remains in system)
    await this.prisma.clubUser.update({
      where: { id: targetClubUserId },
      data: { deletedAt: new Date(), deletedBy: actorUserId },
    });
  }

  /**
   * Get all active ClubUsers who do NOT have a linked Member.
   * Two-step approach: get all active ClubUsers, then filter out those with a linked member.
   */
  async getUnlinkedUsers(clubId: string): Promise<UnlinkedUserDto[]> {
    // Step 1: Get all active ClubUsers
    const clubUsers = await this.prisma.clubUser.findMany({
      where: { clubId, status: 'ACTIVE', deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Step 2: Get all userIds linked to active members in this club
    const linkedMembers = await this.prisma.member.findMany({
      where: { clubId, userId: { not: null }, deletedAt: null },
      select: { userId: true },
    });
    const linkedUserIds = new Set(linkedMembers.map((m) => m.userId));

    // Step 3: Filter to unlinked users
    return clubUsers
      .filter((cu) => !linkedUserIds.has(cu.userId))
      .map((cu) => ({
        id: cu.id,
        userId: cu.userId,
        name: cu.user.name ?? cu.user.email,
        email: cu.user.email,
        image: cu.user.image ?? null,
        roles: cu.roles,
        isExternal: cu.isExternal,
        joinedAt: cu.joinedAt,
      }));
  }

  /**
   * Toggle the isExternal flag on a ClubUser.
   */
  async toggleExternal(
    clubId: string,
    clubUserId: string,
    isExternal: boolean
  ): Promise<UnlinkedUserDto> {
    const clubUser = await this.prisma.clubUser.findUnique({
      where: { id: clubUserId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!clubUser || clubUser.clubId !== clubId) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }

    const updated = await this.prisma.clubUser.update({
      where: { id: clubUserId },
      data: { isExternal },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.user.name ?? updated.user.email,
      email: updated.user.email,
      image: updated.user.image ?? null,
      roles: updated.roles,
      isExternal: updated.isExternal,
      joinedAt: updated.joinedAt,
    };
  }
}
