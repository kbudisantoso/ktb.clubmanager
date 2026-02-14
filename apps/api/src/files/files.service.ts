import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3Service } from './s3.service.js';
import type { CreateFileDto } from './dto/create-file.dto.js';
import { ALLOWED_CONTENT_TYPES, MAX_SIZES } from './dto/create-file.dto.js';
import { getPresignedExpiry } from './file-defaults.js';

/**
 * File management service handling presigned URL upload flow.
 *
 * Flow: createFile -> client uploads via presigned PUT -> confirmUpload
 *
 * Uses raw prisma (not forClub) since File model has its own
 * junction tables (ClubFile, UserFile) for ownership.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service
  ) {}

  /**
   * Create file metadata and return a presigned PUT URL for upload.
   *
   * @param dto - File metadata (filename, contentType, size, purpose)
   * @param clubId - Club ID for scoping
   * @param userId - User initiating the upload
   */
  async createFile(dto: CreateFileDto, clubId: string, userId: string) {
    // Validate content type against allowed types for this purpose
    const allowedTypes = ALLOWED_CONTENT_TYPES[dto.purpose];
    if (!allowedTypes?.includes(dto.contentType)) {
      throw new BadRequestException(
        `Dateityp "${dto.contentType}" ist nicht erlaubt fuer ${dto.purpose}. ` +
          `Erlaubt: ${allowedTypes?.join(', ') ?? 'keine'}`
      );
    }

    // Validate size against maximum for this purpose
    const maxSize = MAX_SIZES[dto.purpose];
    if (maxSize && dto.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(
        `Datei ist zu gross (${Math.round(dto.size / 1024)} KB). Maximum: ${maxMB} MB`
      );
    }

    // Create File record and ClubFile junction in a transaction
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

    // Generate S3 key: clubs/{clubId}/{fileId}
    const s3Key = `clubs/${clubId}/${file.id}`;

    // Update file with actual s3Key and create ClubFile junction
    const [updatedFile] = await this.prisma.$transaction([
      this.prisma.file.update({
        where: { id: file.id },
        data: { s3Key },
      }),
      this.prisma.clubFile.create({
        data: {
          clubId,
          fileId: file.id,
        },
      }),
    ]);

    // Get presigned PUT URL for client-side upload (purpose-aware expiry)
    const { upload: uploadExpiry } = getPresignedExpiry(dto.purpose);
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
   * Confirm that a file has been successfully uploaded to S3.
   *
   * When `purpose` is provided, performs purpose-specific side effects:
   * - `club-logo`: Sets `club.logoFileId` and soft-deletes the previous logo.
   *
   * @param fileId - The file ID to confirm
   * @param clubId - The club ID for ownership verification
   * @param purpose - Optional file purpose for side effects
   * @param userId - User performing the action (for audit trail)
   */
  async confirmUpload(fileId: string, clubId: string, purpose?: string, userId?: string) {
    // Verify file exists and belongs to club via ClubFile junction
    const clubFile = await this.prisma.clubFile.findFirst({
      where: { fileId, clubId },
      include: { file: true },
    });

    if (!clubFile || !clubFile.file) {
      throw new NotFoundException('Datei nicht gefunden');
    }

    const file = clubFile.file;

    if (file.status !== 'PENDING_UPLOAD') {
      throw new BadRequestException(
        `Datei hat den Status "${file.status}" und kann nicht bestaetigt werden`
      );
    }

    // Verify file actually exists in S3
    try {
      await this.s3Service.statObject(file.s3Key);
    } catch {
      throw new BadRequestException(
        'Datei wurde nicht im Speicher gefunden. Bitte erneut hochladen.'
      );
    }

    // Confirm file and handle purpose-specific actions in a transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      const confirmedFile = await tx.file.update({
        where: { id: fileId },
        data: { status: 'UPLOADED', uploadedAt: new Date() },
      });

      if (purpose === 'club-logo') {
        const club = await tx.club.findUnique({
          where: { id: clubId },
          select: { logoFileId: true },
        });

        // Soft-delete the old logo if it exists and is different
        if (club?.logoFileId && club.logoFileId !== fileId) {
          await tx.file.update({
            where: { id: club.logoFileId },
            data: {
              status: 'DELETED',
              deletedAt: new Date(),
              deletedBy: userId ?? 'system',
            },
          });
          this.logger.log(`Old logo ${club.logoFileId} soft-deleted, replaced by ${fileId}`);
        }

        // Set the new logo on the club
        await tx.club.update({
          where: { id: clubId },
          data: { logoFileId: fileId },
        });
      }

      return confirmedFile;
    });

    // Return with presigned GET URL (purpose-aware expiry)
    const { download: downloadExpiry } = getPresignedExpiry(purpose);
    const url = await this.s3Service.presignedGetUrl(updated.s3Key, downloadExpiry);

    return {
      id: updated.id,
      filename: updated.filename,
      contentType: updated.contentType,
      size: updated.size,
      status: updated.status,
      url,
      uploadedAt: updated.uploadedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Get file info with a presigned download URL.
   *
   * @param fileId - The file ID
   * @param clubId - The club ID for ownership verification
   */
  async getFile(fileId: string, clubId: string) {
    const clubFile = await this.prisma.clubFile.findFirst({
      where: { fileId, clubId },
      include: { file: true },
    });

    if (!clubFile || !clubFile.file || clubFile.file.deletedAt) {
      throw new NotFoundException('Datei nicht gefunden');
    }

    const file = clubFile.file;

    // Only provide download URL for uploaded files (default expiry — no purpose context)
    let url: string | null = null;
    if (file.status === 'UPLOADED') {
      const { download: downloadExpiry } = getPresignedExpiry();
      url = await this.s3Service.presignedGetUrl(file.s3Key, downloadExpiry);
    }

    return {
      id: file.id,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      status: file.status,
      url,
      uploadedAt: file.uploadedAt?.toISOString() ?? null,
      createdAt: file.createdAt.toISOString(),
    };
  }

  /**
   * Get presigned download URL for the club's logo (for 302 redirect).
   *
   * @returns Presigned GET URL
   * @throws NotFoundException if club has no logo or logo file is missing/deleted
   */
  async getLogoRedirectUrl(clubId: string): Promise<string> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { logoFileId: true },
    });

    if (!club?.logoFileId) {
      throw new NotFoundException('Kein Logo vorhanden');
    }

    const file = await this.prisma.file.findFirst({
      where: { id: club.logoFileId, deletedAt: null, status: 'UPLOADED' },
      select: { s3Key: true },
    });

    if (!file) {
      throw new NotFoundException('Logo-Datei nicht gefunden');
    }

    const { download } = getPresignedExpiry('club-logo');
    return this.s3Service.presignedGetUrl(file.s3Key, download);
  }

  /**
   * Remove the club's logo: clears `club.logoFileId` and soft-deletes the file.
   *
   * @throws NotFoundException if club has no logo
   */
  async removeClubLogo(clubId: string, userId: string): Promise<void> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { logoFileId: true },
    });

    if (!club?.logoFileId) {
      throw new NotFoundException('Kein Logo vorhanden');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.club.update({
        where: { id: clubId },
        data: { logoFileId: null },
      });

      await tx.file.update({
        where: { id: club.logoFileId! },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });
    });

    this.logger.log(`Club ${clubId} logo ${club.logoFileId} removed by user ${userId}`);
  }

  /**
   * Get presigned download URL for any club file (for 302 redirect).
   *
   * @returns Presigned GET URL
   * @throws NotFoundException if file not found or deleted
   */
  async getFileDownloadUrl(fileId: string, clubId: string): Promise<string> {
    const clubFile = await this.prisma.clubFile.findFirst({
      where: { fileId, clubId },
      include: { file: true },
    });

    if (!clubFile?.file || clubFile.file.deletedAt) {
      throw new NotFoundException('Datei nicht gefunden');
    }

    if (clubFile.file.status !== 'UPLOADED') {
      throw new NotFoundException('Datei ist noch nicht verfuegbar');
    }

    const { download } = getPresignedExpiry();
    return this.s3Service.presignedGetUrl(clubFile.file.s3Key, download);
  }

  /**
   * Soft delete a file.
   *
   * @param fileId - The file ID
   * @param clubId - The club ID for ownership verification
   * @param userId - The user performing the deletion
   */
  async deleteFile(fileId: string, clubId: string, userId: string) {
    const clubFile = await this.prisma.clubFile.findFirst({
      where: { fileId, clubId },
      include: { file: true },
    });

    if (!clubFile || !clubFile.file) {
      throw new NotFoundException('Datei nicht gefunden');
    }

    const file = clubFile.file;

    if (file.deletedAt) {
      throw new BadRequestException('Datei wurde bereits geloescht');
    }

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    this.logger.log(`File ${fileId} soft-deleted by user ${userId}`);

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
}
