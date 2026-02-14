import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileCleanupService } from './file-cleanup.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { S3Service } from './s3.service.js';

const mockPrisma = {
  file: {
    findMany: vi.fn(),
    delete: vi.fn(),
  },
  clubFile: { deleteMany: vi.fn() },
  userFile: { deleteMany: vi.fn() },
};

const mockS3 = {
  deleteObject: vi.fn(),
};

function makeOrphan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-1',
    s3Key: 'clubs/club-1/file-1',
    status: 'PENDING_UPLOAD',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('FileCleanupService', () => {
  let service: FileCleanupService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileCleanupService(
      mockPrisma as unknown as PrismaService,
      mockS3 as unknown as S3Service
    );
  });

  // Happy path
  it('should delete orphaned files from S3 and database', async () => {
    const orphan = makeOrphan();
    mockPrisma.file.findMany.mockResolvedValue([orphan]);
    mockS3.deleteObject.mockResolvedValue(undefined);
    mockPrisma.clubFile.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.userFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.file.delete.mockResolvedValue(orphan);

    await service.cleanupOrphanedUploads();

    expect(mockS3.deleteObject).toHaveBeenCalledWith('clubs/club-1/file-1');
    expect(mockPrisma.clubFile.deleteMany).toHaveBeenCalledWith({
      where: { fileId: 'file-1' },
    });
    expect(mockPrisma.userFile.deleteMany).toHaveBeenCalledWith({
      where: { fileId: 'file-1' },
    });
    expect(mockPrisma.file.delete).toHaveBeenCalledWith({
      where: { id: 'file-1' },
    });
  });

  it('should process multiple orphans', async () => {
    const orphans = [
      makeOrphan({ id: 'file-1', s3Key: 'clubs/c1/file-1' }),
      makeOrphan({ id: 'file-2', s3Key: 'clubs/c1/file-2' }),
    ];
    mockPrisma.file.findMany.mockResolvedValue(orphans);
    mockS3.deleteObject.mockResolvedValue(undefined);
    mockPrisma.clubFile.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.userFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.file.delete.mockResolvedValue({});

    await service.cleanupOrphanedUploads();

    expect(mockS3.deleteObject).toHaveBeenCalledTimes(2);
    expect(mockPrisma.file.delete).toHaveBeenCalledTimes(2);
  });

  // Edge cases
  it('should return early when no orphans found', async () => {
    mockPrisma.file.findMany.mockResolvedValue([]);

    await service.cleanupOrphanedUploads();

    expect(mockS3.deleteObject).not.toHaveBeenCalled();
    expect(mockPrisma.file.delete).not.toHaveBeenCalled();
  });

  it('should skip S3 delete when file has no s3Key', async () => {
    const orphan = makeOrphan({ s3Key: null });
    mockPrisma.file.findMany.mockResolvedValue([orphan]);
    mockPrisma.clubFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.userFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.file.delete.mockResolvedValue(orphan);

    await service.cleanupOrphanedUploads();

    expect(mockS3.deleteObject).not.toHaveBeenCalled();
    expect(mockPrisma.file.delete).toHaveBeenCalled();
  });

  it('should query files older than 24 hours with PENDING_UPLOAD status', async () => {
    mockPrisma.file.findMany.mockResolvedValue([]);

    await service.cleanupOrphanedUploads();

    const call = mockPrisma.file.findMany.mock.calls[0]?.[0] as Record<string, any>;
    expect(call.where.status).toBe('PENDING_UPLOAD');
    // Threshold should be ~24 hours ago
    const threshold = call.where.createdAt.lt as Date;
    const hoursDiff = (Date.now() - threshold.getTime()) / (1000 * 60 * 60);
    expect(hoursDiff).toBeGreaterThanOrEqual(23.9);
    expect(hoursDiff).toBeLessThanOrEqual(24.1);
  });

  // Error cases
  it('should continue processing remaining orphans when one fails', async () => {
    const orphans = [
      makeOrphan({ id: 'file-1', s3Key: 'clubs/c1/file-1' }),
      makeOrphan({ id: 'file-2', s3Key: 'clubs/c1/file-2' }),
    ];
    mockPrisma.file.findMany.mockResolvedValue(orphans);
    mockS3.deleteObject.mockResolvedValue(undefined);
    // First file: DB delete fails
    mockPrisma.clubFile.deleteMany
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValue({ count: 1 });
    mockPrisma.userFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.file.delete.mockResolvedValue({});

    await service.cleanupOrphanedUploads();

    // Second orphan should still be processed
    expect(mockPrisma.file.delete).toHaveBeenCalledWith({ where: { id: 'file-2' } });
  });

  it('should swallow S3 delete errors gracefully', async () => {
    const orphan = makeOrphan();
    mockPrisma.file.findMany.mockResolvedValue([orphan]);
    // S3 delete fails but is caught internally
    mockS3.deleteObject.mockRejectedValue(new Error('S3 not reachable'));
    mockPrisma.clubFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.userFile.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.file.delete.mockResolvedValue(orphan);

    await service.cleanupOrphanedUploads();

    // DB cleanup still proceeds despite S3 failure
    expect(mockPrisma.file.delete).toHaveBeenCalled();
  });
});
