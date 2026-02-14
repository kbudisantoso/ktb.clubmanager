import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from '../files/s3.service.js';
import { ALLOWED_CONTENT_TYPES, MAX_SIZES } from '../files/dto/create-file.dto.js';
import { getPresignedExpiry } from '../files/file-defaults.js';
import type { CreateFileDto } from '../files/dto/create-file.dto.js';

@Injectable()
export class MeService {
  private readonly logger = new Logger(MeService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  /**
   * Update user display name.
   */
  async updateProfile(userId: string, data: { name: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
      select: { id: true, name: true, email: true, image: true },
    });
    return user;
  }

  /**
   * Create avatar file metadata and return a presigned PUT URL for upload.
   */
  async createAvatarFile(userId: string, dto: CreateFileDto) {
    const allowedTypes = ALLOWED_CONTENT_TYPES['user-avatar'];
    if (!allowedTypes?.includes(dto.contentType)) {
      throw new BadRequestException(
        `Dateityp "${dto.contentType}" ist nicht erlaubt fuer user-avatar. ` +
          `Erlaubt: ${allowedTypes?.join(', ') ?? 'keine'}`
      );
    }

    const maxSize = MAX_SIZES['user-avatar'];
    if (maxSize && dto.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(
        `Datei ist zu gross (${Math.round(dto.size / 1024)} KB). Maximum: ${maxMB} MB`
      );
    }

    // Create File record
    const file = await this.prisma.file.create({
      data: {
        filename: dto.filename,
        contentType: dto.contentType,
        size: dto.size,
        status: 'PENDING_UPLOAD',
        s3Key: '', // Placeholder, updated below
        uploadedById: userId,
      },
    });

    const s3Key = `users/${userId}/${file.id}`;

    // Update file with s3Key and create UserFile junction
    const [updatedFile] = await this.prisma.$transaction([
      this.prisma.file.update({
        where: { id: file.id },
        data: { s3Key },
      }),
      this.prisma.userFile.create({
        data: { userId, fileId: file.id },
      }),
    ]);

    const { upload: uploadExpiry } = getPresignedExpiry('user-avatar');
    const uploadUrl = await this.s3Service.presignedPutUrl(s3Key, uploadExpiry);

    return {
      id: updatedFile.id,
      filename: updatedFile.filename,
      contentType: updatedFile.contentType,
      size: updatedFile.size,
      status: updatedFile.status,
      uploadUrl,
      createdAt: updatedFile.createdAt.toISOString(),
    };
  }

  /**
   * Confirm avatar upload: verify in S3, update status, replace old avatar, set user.image.
   */
  async confirmAvatarUpload(userId: string, fileId: string) {
    // Verify file belongs to user via UserFile junction
    const userFile = await this.prisma.userFile.findFirst({
      where: { fileId, userId },
      include: { file: true },
    });

    if (!userFile?.file) {
      throw new NotFoundException('Datei nicht gefunden');
    }

    const file = userFile.file;

    if (file.status !== 'PENDING_UPLOAD') {
      throw new BadRequestException(
        `Datei hat den Status "${file.status}" und kann nicht bestaetigt werden`
      );
    }

    // Verify file exists in S3
    try {
      await this.s3Service.statObject(file.s3Key);
    } catch {
      throw new BadRequestException(
        'Datei wurde nicht im Speicher gefunden. Bitte erneut hochladen.'
      );
    }

    // Atomic transaction: confirm file, soft-delete old avatar, update user.image
    const updated = await this.prisma.$transaction(async (tx) => {
      const confirmedFile = await tx.file.update({
        where: { id: fileId },
        data: { status: 'UPLOADED', uploadedAt: new Date() },
      });

      // Find and soft-delete old avatar(s)
      const oldAvatarFiles = await tx.userFile.findMany({
        where: {
          userId,
          fileId: { not: fileId },
          file: { status: 'UPLOADED' },
        },
        include: { file: true },
      });

      for (const oldUf of oldAvatarFiles) {
        await tx.file.update({
          where: { id: oldUf.fileId },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
            deletedBy: userId,
          },
        });
        this.logger.log(`Old avatar ${oldUf.fileId} soft-deleted, replaced by ${fileId}`);
      }

      // Set user.image to permanent avatar endpoint (not a presigned URL)
      await tx.user.update({
        where: { id: userId },
        data: { image: '/api/me/avatar' },
      });

      return confirmedFile;
    });

    return {
      id: updated.id,
      filename: updated.filename,
      contentType: updated.contentType,
      size: updated.size,
      status: updated.status,
      uploadedAt: updated.uploadedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Get a fresh presigned GET URL for the user's avatar (for 302 redirect).
   */
  async getAvatarRedirectUrl(userId: string): Promise<string> {
    const userFile = await this.prisma.userFile.findFirst({
      where: {
        userId,
        file: { status: 'UPLOADED', deletedAt: null },
      },
      include: { file: { select: { s3Key: true } } },
    });

    if (!userFile?.file) {
      throw new NotFoundException('Kein Profilbild vorhanden');
    }

    const { download } = getPresignedExpiry('user-avatar');
    return this.s3Service.presignedGetUrl(userFile.file.s3Key, download);
  }

  /**
   * Remove user avatar: clear user.image, soft-delete avatar file.
   */
  async removeAvatar(userId: string) {
    const userFile = await this.prisma.userFile.findFirst({
      where: {
        userId,
        file: { status: 'UPLOADED', deletedAt: null },
      },
      include: { file: true },
    });

    if (!userFile?.file) {
      throw new NotFoundException('Kein Profilbild vorhanden');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { image: null },
      });

      await tx.file.update({
        where: { id: userFile.fileId },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });
    });

    this.logger.log(`User ${userId} avatar ${userFile.fileId} removed`);

    return { message: 'Profilbild entfernt' };
  }

  /**
   * Get all active sessions for a user, marking the current one.
   */
  async getSessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revoke a specific session (not the current one).
   */
  async revokeSession(userId: string, sessionId: string, currentSessionId: string) {
    if (sessionId === currentSessionId) {
      throw new BadRequestException('Die aktuelle Sitzung kann nicht widerrufen werden');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      throw new NotFoundException('Sitzung nicht gefunden');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Keine Berechtigung');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });

    return { message: 'Sitzung beendet' };
  }

  /**
   * Revoke all sessions except the current one.
   */
  async revokeAllOtherSessions(userId: string, currentSessionId: string) {
    const result = await this.prisma.session.deleteMany({
      where: {
        userId,
        id: { not: currentSessionId },
        expiresAt: { gt: new Date() },
      },
    });

    return {
      message: `${result.count} Sitzung(en) beendet`,
      count: result.count,
    };
  }

  /**
   * Check if user can delete their account (blocked if sole owner of any club).
   */
  async checkAccountDeletion(userId: string) {
    // Find clubs where user has OWNER role
    const ownedClubUsers = await this.prisma.clubUser.findMany({
      where: {
        userId,
        roles: { has: 'OWNER' },
        club: { deletedAt: null },
      },
      include: { club: { select: { id: true, name: true, slug: true } } },
    });

    const blockedClubs: { id: string; name: string; slug: string }[] = [];

    for (const cu of ownedClubUsers) {
      const otherOwners = await this.prisma.clubUser.count({
        where: {
          clubId: cu.clubId,
          userId: { not: userId },
          roles: { has: 'OWNER' },
        },
      });

      if (otherOwners === 0) {
        blockedClubs.push({
          id: cu.club.id,
          name: cu.club.name,
          slug: cu.club.slug,
        });
      }
    }

    if (blockedClubs.length > 0) {
      return { canDelete: false, blockedClubs };
    }

    return { canDelete: true };
  }

  /**
   * Delete (anonymize) user account. Blocked if sole owner of any club.
   */
  async deleteAccount(userId: string) {
    const check = await this.checkAccountDeletion(userId);

    if (!check.canDelete) {
      throw new BadRequestException({
        message:
          'Konto kann nicht geloescht werden. Du bist der einzige Verantwortliche in folgenden Vereinen.',
        blockedClubs: check.blockedClubs,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Anonymize user data (soft delete per CONV-006)
      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Geloeschter Benutzer',
          email: `deleted_${userId}@anonymized.local`,
          image: null,
          emailVerified: false,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      // Unlink member records (membership lifecycle is independent)
      await tx.member.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Delete all sessions
      await tx.session.deleteMany({ where: { userId } });

      // Soft-delete all UserFile records
      const userFiles = await tx.userFile.findMany({
        where: { userId },
        select: { fileId: true },
      });

      if (userFiles.length > 0) {
        await tx.file.updateMany({
          where: {
            id: { in: userFiles.map((uf) => uf.fileId) },
            deletedAt: null,
          },
          data: {
            status: 'DELETED',
            deletedAt: new Date(),
            deletedBy: userId,
          },
        });
      }
    });

    this.logger.log(`User ${userId} account anonymized`);

    return { message: 'Konto wurde geloescht' };
  }
}
