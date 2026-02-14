import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeService } from './me.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { S3Service } from '../files/s3.service.js';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock PrismaService
const mockPrisma = {
  user: {
    update: vi.fn(),
  },
  file: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  userFile: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  session: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  member: {
    updateMany: vi.fn(),
  },
  clubUser: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock S3Service
const mockS3 = {
  presignedPutUrl: vi.fn(),
  presignedGetUrl: vi.fn(),
  statObject: vi.fn(),
};

/** Factory helpers */
function makeFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-1',
    filename: 'avatar.jpg',
    contentType: 'image/jpeg',
    size: 50000,
    status: 'PENDING_UPLOAD',
    s3Key: 'users/user-1/file-1',
    uploadedById: 'user-1',
    uploadedAt: null,
    deletedAt: null,
    deletedBy: null,
    createdAt: new Date('2026-02-14'),
    updatedAt: new Date('2026-02-14'),
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    userId: 'user-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2026-02-14T10:00:00Z'),
    expiresAt: new Date('2026-02-15T10:00:00Z'),
    ...overrides,
  };
}

describe('MeService', () => {
  let service: MeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MeService(mockPrisma as unknown as PrismaService, mockS3 as unknown as S3Service);
  });

  // ---------- updateProfile ----------
  describe('updateProfile()', () => {
    it('should update user name and return the updated user', async () => {
      const updated = {
        id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        image: null,
      };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { name: 'Max Mustermann' });

      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Max Mustermann' },
        select: { id: true, name: true, email: true, image: true },
      });
    });

    it('should pass through whitespace in name (validation is at DTO level)', async () => {
      const updated = { id: 'user-1', name: '  Spaced  ', email: 'a@b.com', image: null };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { name: '  Spaced  ' });

      expect(result.name).toBe('  Spaced  ');
    });
  });

  // ---------- createAvatarFile ----------
  describe('createAvatarFile()', () => {
    const validDto = {
      filename: 'avatar.jpg',
      contentType: 'image/jpeg',
      size: 50000,
      purpose: 'user-avatar' as const,
    };

    it('should create File + UserFile records and return presigned PUT URL', async () => {
      const createdFile = makeFile();
      const updatedFile = makeFile({ s3Key: 'users/user-1/file-1' });

      mockPrisma.file.create.mockResolvedValue(createdFile);
      mockPrisma.$transaction.mockResolvedValue([updatedFile, {}]);
      mockS3.presignedPutUrl.mockResolvedValue('https://s3.example.com/put?token=abc');

      const result = await service.createAvatarFile('user-1', validDto);

      expect(result.id).toBe('file-1');
      expect(result.status).toBe('PENDING_UPLOAD');
      expect(result.uploadUrl).toBe('https://s3.example.com/put?token=abc');
      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filename: 'avatar.jpg',
            contentType: 'image/jpeg',
            status: 'PENDING_UPLOAD',
            uploadedById: 'user-1',
          }),
        })
      );
    });

    it('should reject invalid content type', async () => {
      const invalidDto = { ...validDto, contentType: 'application/pdf' };

      await expect(service.createAvatarFile('user-1', invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject oversized file', async () => {
      const oversizedDto = { ...validDto, size: 10 * 1024 * 1024 }; // 10 MB > 5 MB limit

      await expect(service.createAvatarFile('user-1', oversizedDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ---------- confirmAvatarUpload ----------
  describe('confirmAvatarUpload()', () => {
    function setupInteractiveTransaction() {
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
      );
    }

    it('should confirm upload, update user.image, and return file data', async () => {
      const file = makeFile();
      mockPrisma.userFile.findFirst.mockResolvedValue({ file, userId: 'user-1', fileId: 'file-1' });
      mockS3.statObject.mockResolvedValue({ size: 50000 });
      const confirmedFile = makeFile({
        status: 'UPLOADED',
        uploadedAt: new Date('2026-02-14T12:00:00Z'),
      });
      mockPrisma.file.update.mockResolvedValue(confirmedFile);
      mockPrisma.userFile.findMany.mockResolvedValue([]);
      mockPrisma.user.update.mockResolvedValue({});
      setupInteractiveTransaction();

      const result = await service.confirmAvatarUpload('user-1', 'file-1');

      expect(result.status).toBe('UPLOADED');
      expect(result.id).toBe('file-1');
    });

    it('should soft-delete old avatar when new one is confirmed', async () => {
      const file = makeFile();
      mockPrisma.userFile.findFirst.mockResolvedValue({ file, userId: 'user-1', fileId: 'file-1' });
      mockS3.statObject.mockResolvedValue({ size: 50000 });
      const confirmedFile = makeFile({
        status: 'UPLOADED',
        uploadedAt: new Date('2026-02-14T12:00:00Z'),
      });
      mockPrisma.file.update.mockResolvedValue(confirmedFile);
      const oldAvatar = { fileId: 'old-file', file: makeFile({ id: 'old-file' }) };
      mockPrisma.userFile.findMany.mockResolvedValue([oldAvatar]);
      mockPrisma.user.update.mockResolvedValue({});
      setupInteractiveTransaction();

      await service.confirmAvatarUpload('user-1', 'file-1');

      // Old avatar soft-deleted
      expect(mockPrisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'old-file' },
          data: expect.objectContaining({
            status: 'DELETED',
            deletedBy: 'user-1',
          }),
        })
      );
      // user.image set to permanent URL
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { image: '/api/me/avatar' },
        })
      );
    });

    it('should throw NotFoundException when file not found', async () => {
      mockPrisma.userFile.findFirst.mockResolvedValue(null);

      await expect(service.confirmAvatarUpload('user-1', 'file-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when file is not PENDING_UPLOAD', async () => {
      const file = makeFile({ status: 'UPLOADED' });
      mockPrisma.userFile.findFirst.mockResolvedValue({ file, userId: 'user-1', fileId: 'file-1' });

      await expect(service.confirmAvatarUpload('user-1', 'file-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when file not in S3', async () => {
      const file = makeFile();
      mockPrisma.userFile.findFirst.mockResolvedValue({ file, userId: 'user-1', fileId: 'file-1' });
      mockS3.statObject.mockRejectedValue(new Error('Not found'));

      await expect(service.confirmAvatarUpload('user-1', 'file-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ---------- getAvatarRedirectUrl ----------
  describe('getAvatarRedirectUrl()', () => {
    it('should return a presigned GET URL for the avatar', async () => {
      mockPrisma.userFile.findFirst.mockResolvedValue({
        file: { s3Key: 'users/user-1/file-1' },
      });
      mockS3.presignedGetUrl.mockResolvedValue('https://s3.example.com/get?token=xyz');

      const url = await service.getAvatarRedirectUrl('user-1');

      expect(url).toBe('https://s3.example.com/get?token=xyz');
      expect(mockS3.presignedGetUrl).toHaveBeenCalledWith('users/user-1/file-1', 60);
    });

    it('should throw NotFoundException when no avatar exists', async () => {
      mockPrisma.userFile.findFirst.mockResolvedValue(null);

      await expect(service.getAvatarRedirectUrl('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- removeAvatar ----------
  describe('removeAvatar()', () => {
    function setupInteractiveTransaction() {
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
      );
    }

    it('should clear user.image and soft-delete the avatar file', async () => {
      const file = makeFile({ status: 'UPLOADED' });
      mockPrisma.userFile.findFirst.mockResolvedValue({ file, userId: 'user-1', fileId: 'file-1' });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.file.update.mockResolvedValue({});
      setupInteractiveTransaction();

      const result = await service.removeAvatar('user-1');

      expect(result.message).toBe('Profilbild entfernt');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { image: null },
        })
      );
      expect(mockPrisma.file.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-1' },
          data: expect.objectContaining({
            status: 'DELETED',
            deletedBy: 'user-1',
          }),
        })
      );
    });

    it('should throw NotFoundException when no avatar exists', async () => {
      mockPrisma.userFile.findFirst.mockResolvedValue(null);

      await expect(service.removeAvatar('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ---------- getSessions ----------
  describe('getSessions()', () => {
    it('should return sessions with isCurrent flag', async () => {
      const sessions = [
        makeSession({ id: 'session-current' }),
        makeSession({ id: 'session-other' }),
      ];
      mockPrisma.session.findMany.mockResolvedValue(sessions);

      const result = await service.getSessions('user-1', 'session-current');

      expect(result).toHaveLength(2);
      expect(result[0]!.isCurrent).toBe(true);
      expect(result[1]!.isCurrent).toBe(false);
      expect(result[0]!.createdAt).toEqual(expect.any(String));
      expect(result[0]!.expiresAt).toEqual(expect.any(String));
    });

    it('should only return non-expired sessions (query filter)', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);

      await service.getSessions('user-1', 'session-1');

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            expiresAt: { gt: expect.any(Date) },
          }),
        })
      );
    });
  });

  // ---------- revokeSession ----------
  describe('revokeSession()', () => {
    it('should revoke a non-current session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.session.delete.mockResolvedValue({});

      const result = await service.revokeSession('user-1', 'session-other', 'session-current');

      expect(result.message).toBe('Sitzung beendet');
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-other' } });
    });

    it('should prevent revoking the current session', async () => {
      await expect(
        service.revokeSession('user-1', 'session-current', 'session-current')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeSession('user-1', 'session-unknown', 'session-current')
      ).rejects.toThrow(NotFoundException);
    });

    it("should prevent revoking another user's session", async () => {
      mockPrisma.session.findUnique.mockResolvedValue({ userId: 'user-other' });

      await expect(
        service.revokeSession('user-1', 'session-other', 'session-current')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------- revokeAllOtherSessions ----------
  describe('revokeAllOtherSessions()', () => {
    it('should delete all sessions except the current one', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.revokeAllOtherSessions('user-1', 'session-current');

      expect(result.count).toBe(3);
      expect(result.message).toBe('3 Sitzung(en) beendet');
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          id: { not: 'session-current' },
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });
  });

  // ---------- checkAccountDeletion ----------
  describe('checkAccountDeletion()', () => {
    it('should return canDelete true when not sole owner of any club', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);

      const result = await service.checkAccountDeletion('user-1');

      expect(result.canDelete).toBe(true);
    });

    it('should return canDelete false with list of clubs where sole owner', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([
        {
          clubId: 'club-1',
          userId: 'user-1',
          roles: ['OWNER'],
          club: { id: 'club-1', name: 'Sportverein', slug: 'sportverein' },
        },
      ]);
      // No other owners for club-1
      mockPrisma.clubUser.count.mockResolvedValue(0);

      const result = await service.checkAccountDeletion('user-1');

      expect(result.canDelete).toBe(false);
      expect(result.blockedClubs).toEqual([
        { id: 'club-1', name: 'Sportverein', slug: 'sportverein' },
      ]);
    });

    it('should allow deletion when club has shared ownership (2+ owners)', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([
        {
          clubId: 'club-1',
          userId: 'user-1',
          roles: ['OWNER'],
          club: { id: 'club-1', name: 'Sportverein', slug: 'sportverein' },
        },
      ]);
      // Another owner exists for club-1
      mockPrisma.clubUser.count.mockResolvedValue(1);

      const result = await service.checkAccountDeletion('user-1');

      expect(result.canDelete).toBe(true);
    });
  });

  // ---------- deleteAccount ----------
  describe('deleteAccount()', () => {
    function setupInteractiveTransaction() {
      mockPrisma.$transaction.mockImplementation(
        (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
      );
    }

    it('should anonymize user, unlink members, delete sessions, and soft-delete files', async () => {
      // checkAccountDeletion returns canDelete: true
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.member.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.userFile.findMany.mockResolvedValue([{ fileId: 'file-1' }, { fileId: 'file-2' }]);
      mockPrisma.file.updateMany.mockResolvedValue({ count: 2 });
      setupInteractiveTransaction();

      const result = await service.deleteAccount('user-1');

      expect(result.message).toBe('Konto wurde geloescht');

      // Verify anonymization
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            name: 'Geloeschter Benutzer',
            email: 'deleted_user-1@anonymized.local',
            image: null,
            emailVerified: false,
          }),
        })
      );

      // Verify member records unlinked (independent lifecycle)
      expect(mockPrisma.member.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { userId: null },
      });

      // Verify sessions deleted
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });

      // Verify files soft-deleted
      expect(mockPrisma.file.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['file-1', 'file-2'] },
            deletedAt: null,
          },
          data: expect.objectContaining({
            status: 'DELETED',
            deletedBy: 'user-1',
          }),
        })
      );
    });

    it('should throw BadRequestException when sole owner check fails', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([
        {
          clubId: 'club-1',
          userId: 'user-1',
          roles: ['OWNER'],
          club: { id: 'club-1', name: 'Sportverein', slug: 'sportverein' },
        },
      ]);
      mockPrisma.clubUser.count.mockResolvedValue(0); // sole owner

      await expect(service.deleteAccount('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should handle account with no files gracefully', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.member.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userFile.findMany.mockResolvedValue([]);
      setupInteractiveTransaction();

      const result = await service.deleteAccount('user-1');

      expect(result.message).toBe('Konto wurde geloescht');
      expect(mockPrisma.file.updateMany).not.toHaveBeenCalled();
    });
  });
});
