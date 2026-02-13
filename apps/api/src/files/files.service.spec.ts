import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesService } from './files.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { S3Service } from './s3.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CreateFileDto } from './dto/create-file.dto.js';

// Mock PrismaService — raw prisma (not forClub) since FilesService uses
// file/clubFile models directly for ownership junction
const mockPrisma = {
  file: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  clubFile: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock S3Service
const mockS3 = {
  presignedPutUrl: vi.fn(),
  presignedGetUrl: vi.fn(),
  statObject: vi.fn(),
  deleteObject: vi.fn(),
};

/** Minimal file factory */
function makeFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-1',
    filename: 'logo.png',
    contentType: 'image/png',
    size: 50000,
    status: 'PENDING_UPLOAD',
    s3Key: 'clubs/club-1/file-1',
    uploadedById: 'user-1',
    uploadedAt: null,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  };
}

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FilesService(
      mockPrisma as unknown as PrismaService,
      mockS3 as unknown as S3Service
    );
  });

  describe('createFile()', () => {
    const dto: CreateFileDto = {
      filename: 'logo.png',
      contentType: 'image/png',
      size: 50000,
      purpose: 'club-logo',
    };
    const clubId = 'club-1';
    const userId = 'user-1';

    it('should create PENDING_UPLOAD record and return presigned URL', async () => {
      const createdFile = makeFile();
      const updatedFile = makeFile({ s3Key: 'clubs/club-1/file-1' });

      mockPrisma.file.create.mockResolvedValue(createdFile);
      mockPrisma.$transaction.mockResolvedValue([updatedFile, {}]);
      mockS3.presignedPutUrl.mockResolvedValue('https://s3.example.com/upload?token=abc');

      const result = await service.createFile(dto, clubId, userId);

      expect(result.id).toBe('file-1');
      expect(result.status).toBe('PENDING_UPLOAD');
      expect(result.uploadUrl).toBe('https://s3.example.com/upload?token=abc');
      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filename: 'logo.png',
            contentType: 'image/png',
            size: 50000,
            status: 'PENDING_UPLOAD',
            uploadedById: 'user-1',
          }),
        })
      );
    });

    it('should reject invalid content type', async () => {
      const invalidDto: CreateFileDto = {
        ...dto,
        contentType: 'application/pdf',
      };

      await expect(service.createFile(invalidDto, clubId, userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject oversized file', async () => {
      const oversizedDto: CreateFileDto = {
        ...dto,
        size: 10 * 1024 * 1024, // 10 MB exceeds 5 MB limit
      };

      await expect(service.createFile(oversizedDto, clubId, userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('confirmUpload()', () => {
    const fileId = 'file-1';
    const clubId = 'club-1';

    it('should transition to UPLOADED when S3 file exists', async () => {
      const file = makeFile();
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });
      mockS3.statObject.mockResolvedValue({ size: 50000 });
      const uploadedFile = makeFile({
        status: 'UPLOADED',
        uploadedAt: new Date('2026-01-15T10:00:00Z'),
      });
      mockPrisma.file.update.mockResolvedValue(uploadedFile);
      mockS3.presignedGetUrl.mockResolvedValue('https://s3.example.com/get?token=xyz');

      const result = await service.confirmUpload(fileId, clubId);

      expect(result.status).toBe('UPLOADED');
      expect(result.url).toBe('https://s3.example.com/get?token=xyz');
      expect(mockPrisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'UPLOADED' }),
        })
      );
    });

    it('should throw when S3 stat fails', async () => {
      const file = makeFile();
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });
      mockS3.statObject.mockRejectedValue(new Error('Not found'));

      await expect(service.confirmUpload(fileId, clubId)).rejects.toThrow(BadRequestException);
    });

    it('should throw when file is already UPLOADED', async () => {
      const file = makeFile({ status: 'UPLOADED' });
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });

      await expect(service.confirmUpload(fileId, clubId)).rejects.toThrow(BadRequestException);
    });

    it('should throw when file not found', async () => {
      mockPrisma.clubFile.findFirst.mockResolvedValue(null);

      await expect(service.confirmUpload(fileId, clubId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFile()', () => {
    const fileId = 'file-1';
    const clubId = 'club-1';
    const userId = 'user-1';

    it('should soft delete file', async () => {
      const file = makeFile({ status: 'UPLOADED' });
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });
      const deletedFile = makeFile({
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: 'user-1',
      });
      mockPrisma.file.update.mockResolvedValue(deletedFile);

      const result = await service.deleteFile(fileId, clubId, userId);

      expect(result.status).toBe('DELETED');
      expect(mockPrisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DELETED',
            deletedAt: expect.any(Date),
            deletedBy: userId,
          }),
        })
      );
    });

    it('should throw when file already deleted', async () => {
      const file = makeFile({ deletedAt: new Date() });
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });

      await expect(service.deleteFile(fileId, clubId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw when file not found', async () => {
      mockPrisma.clubFile.findFirst.mockResolvedValue(null);

      await expect(service.deleteFile(fileId, clubId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFile()', () => {
    const fileId = 'file-1';
    const clubId = 'club-1';

    it('should return presigned GET URL for UPLOADED file', async () => {
      const file = makeFile({ status: 'UPLOADED' });
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });
      mockS3.presignedGetUrl.mockResolvedValue('https://s3.example.com/get?token=abc');

      const result = await service.getFile(fileId, clubId);

      expect(result.url).toBe('https://s3.example.com/get?token=abc');
      expect(result.status).toBe('UPLOADED');
    });

    it('should return null URL for non-UPLOADED file', async () => {
      const file = makeFile({ status: 'PENDING_UPLOAD' });
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });

      const result = await service.getFile(fileId, clubId);

      expect(result.url).toBeNull();
    });

    it('should throw for deleted file', async () => {
      const file = makeFile({ deletedAt: new Date() });
      mockPrisma.clubFile.findFirst.mockResolvedValue({ file, clubId });

      await expect(service.getFile(fileId, clubId)).rejects.toThrow(NotFoundException);
    });

    it('should throw for non-existent file', async () => {
      mockPrisma.clubFile.findFirst.mockResolvedValue(null);

      await expect(service.getFile(fileId, clubId)).rejects.toThrow(NotFoundException);
    });
  });
});
