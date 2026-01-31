import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { normalizeInviteCode, isInviteCodeValid } from '@ktb/shared';

/**
 * German rejection reason messages
 */
const REJECTION_MESSAGES: Record<string, string> = {
  BOARD_ONLY: 'Nur Vorstandsmitglieder haben Zugang',
  UNIDENTIFIED: 'Wir konnten dich leider nicht zuordnen',
  WRONG_CLUB: 'Das scheint nicht der richtige Verein zu sein',
  CONTACT_DIRECTLY: 'Bitte kontaktiere uns direkt',
  OTHER: 'Sonstiger Grund',
};

@Injectable()
export class AccessRequestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Join a private club using invite code.
   * Directly adds user as VIEWER if code is valid.
   */
  async joinWithCode(userId: string, code: string) {
    const normalizedCode = normalizeInviteCode(code);

    if (!isInviteCodeValid(normalizedCode)) {
      throw new BadRequestException('Ungultiger Einladungscode');
    }

    // Find club by invite code
    const club = await this.prisma.club.findFirst({
      where: {
        inviteCode: normalizedCode,
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException(
        'Einladungscode nicht gefunden oder abgelaufen',
      );
    }

    // Check if already a member
    const existingMembership = await this.prisma.clubUser.findFirst({
      where: {
        userId,
        clubId: club.id,
      },
    });

    if (existingMembership) {
      if (existingMembership.status === 'ACTIVE') {
        return { message: 'Du bist bereits Mitglied dieses Vereins', club };
      }
      // Reactivate suspended/pending membership
      await this.prisma.clubUser.update({
        where: { id: existingMembership.id },
        data: { status: 'ACTIVE' },
      });
      return { message: 'Deine Mitgliedschaft wurde reaktiviert', club };
    }

    // Create membership
    await this.prisma.clubUser.create({
      data: {
        userId,
        clubId: club.id,
        role: 'VIEWER',
        status: 'ACTIVE',
      },
    });

    return {
      message: 'Du bist dem Verein beigetreten',
      club: {
        id: club.id,
        name: club.name,
        slug: club.slug,
      },
    };
  }

  /**
   * Request access to a public club.
   */
  async requestAccess(userId: string, clubIdOrSlug: string, message?: string) {
    // Find club
    const club = await this.prisma.club.findFirst({
      where: {
        OR: [{ id: clubIdOrSlug }, { slug: clubIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Check visibility
    if (club.visibility !== 'PUBLIC') {
      throw new BadRequestException(
        'Dieser Verein ist privat. Du benoetigst einen Einladungscode.',
      );
    }

    // Check if already a member
    const existingMembership = await this.prisma.clubUser.findFirst({
      where: { userId, clubId: club.id, status: 'ACTIVE' },
    });

    if (existingMembership) {
      throw new BadRequestException('Du bist bereits Mitglied dieses Vereins');
    }

    // Check rate limit: max 5 pending requests per user
    const pendingCount = await this.prisma.accessRequest.count({
      where: { userId, status: 'PENDING' },
    });

    if (pendingCount >= 5) {
      throw new BadRequestException(
        'Du hast bereits 5 ausstehende Anfragen. Bitte warte auf eine Antwort.',
      );
    }

    // Check if already requested this club
    const existingRequest = await this.prisma.accessRequest.findFirst({
      where: {
        userId,
        clubId: club.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Du hast bereits eine Anfrage fuer diesen Verein gestellt',
      );
    }

    // Create request with 30-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const request = await this.prisma.accessRequest.create({
      data: {
        userId,
        clubId: club.id,
        message,
        expiresAt,
      },
      include: {
        club: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return {
      message: 'Anfrage wurde gesendet',
      request,
    };
  }

  /**
   * Get pending access requests for a club (admin view).
   */
  async getClubRequests(clubIdOrSlug: string, adminUserId: string) {
    // Find club first
    const club = await this.prisma.club.findFirst({
      where: {
        OR: [{ id: clubIdOrSlug }, { slug: clubIdOrSlug }],
        deletedAt: null,
      },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Verify admin access
    await this.verifyClubAdmin(club.id, adminUserId);

    return this.prisma.accessRequest.findMany({
      where: {
        clubId: club.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve an access request.
   */
  async approve(requestId: string, role: string, adminUserId: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: { club: true },
    });

    if (!request) {
      throw new NotFoundException('Anfrage nicht gefunden');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Anfrage wurde bereits bearbeitet');
    }

    // Verify admin access
    await this.verifyClubAdmin(request.clubId, adminUserId);

    // Create membership and update request in transaction
    await this.prisma.$transaction([
      this.prisma.clubUser.create({
        data: {
          userId: request.userId,
          clubId: request.clubId,
          role: role as 'VIEWER' | 'TREASURER' | 'ADMIN',
          status: 'ACTIVE',
          invitedById: adminUserId,
        },
      }),
      this.prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          processedById: adminUserId,
          processedAt: new Date(),
        },
      }),
    ]);

    return { message: 'Anfrage genehmigt' };
  }

  /**
   * Reject an access request.
   */
  async reject(
    requestId: string,
    reason: string,
    note: string | undefined,
    adminUserId: string,
  ) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Anfrage nicht gefunden');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Anfrage wurde bereits bearbeitet');
    }

    // Verify admin access
    await this.verifyClubAdmin(request.clubId, adminUserId);

    // Require note for OTHER reason
    if (reason === 'OTHER' && !note) {
      throw new BadRequestException('Bitte gib einen Grund an');
    }

    await this.prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason as
          | 'BOARD_ONLY'
          | 'UNIDENTIFIED'
          | 'WRONG_CLUB'
          | 'CONTACT_DIRECTLY'
          | 'OTHER',
        rejectionNote: note,
        processedById: adminUserId,
        processedAt: new Date(),
      },
    });

    return {
      message: 'Anfrage abgelehnt',
      displayReason: REJECTION_MESSAGES[reason] || reason,
    };
  }

  /**
   * Get user's pending and recent requests.
   */
  async getMyRequests(userId: string) {
    return this.prisma.accessRequest.findMany({
      where: { userId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarInitials: true,
            avatarColor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Cancel a pending request.
   */
  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Anfrage nicht gefunden');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        'Anfrage kann nicht mehr abgebrochen werden',
      );
    }

    await this.prisma.accessRequest.delete({
      where: { id: requestId },
    });

    return { message: 'Anfrage zuruckgezogen' };
  }

  private async verifyClubAdmin(clubId: string, userId: string) {
    const membership = await this.prisma.clubUser.findFirst({
      where: {
        userId,
        clubId,
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Keine Berechtigung');
    }
  }
}
