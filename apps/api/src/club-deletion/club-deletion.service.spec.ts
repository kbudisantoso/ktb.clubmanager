import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubDeletionService } from './club-deletion.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { S3Service } from '../files/s3.service.js';
import type { SystemUserService } from '../common/services/system-user.service.js';
import type { ClubDeletionLogService } from './club-deletion-log.service.js';

const SYSTEM_USER_ID = 'system-user-uuid-123';

const mockPrisma = {
  clubFile: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  club: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  memberStatusTransition: {
    deleteMany: vi.fn(),
  },
  member: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  membershipPeriod: {
    deleteMany: vi.fn(),
  },
  household: {
    deleteMany: vi.fn(),
  },
  numberRange: {
    deleteMany: vi.fn(),
  },
  membershipType: {
    deleteMany: vi.fn(),
  },
  accessRequest: {
    deleteMany: vi.fn(),
  },
  clubUser: {
    deleteMany: vi.fn(),
  },
  auditLog: {
    deleteMany: vi.fn(),
  },
  ledgerAccount: {
    deleteMany: vi.fn(),
  },
  file: {
    delete: vi.fn(),
  },
  userFile: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaService;

const mockS3Service = {
  deleteObject: vi.fn(),
} as unknown as S3Service;

const mockSystemUserService = {
  getSystemUserId: vi.fn(() => SYSTEM_USER_ID),
} as unknown as SystemUserService;

const mockClubDeletionLogService = {
  findBySlug: vi.fn(),
  markDeleted: vi.fn(),
} as unknown as ClubDeletionLogService;

describe('ClubDeletionService', () => {
  let service: ClubDeletionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClubDeletionService(
      mockPrisma,
      mockS3Service,
      mockSystemUserService,
      mockClubDeletionLogService
    );

    // Default: $transaction executes callback immediately
    (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cbOrArray: unknown) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray(mockPrisma);
        }
        return cbOrArray;
      }
    );
  });

  describe('permanentlyDeleteClub()', () => {
    it('should execute phases in order: S3 files, DB transaction, deletion log', async () => {
      const callOrder: string[] = [];

      // S3 phase setup — track via club.findUnique (only called in S3 phase)
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('s3');
        return { id: 'club-1', logoFile: null };
      });

      // DB phase setup
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });

      // Track DB transaction call
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: unknown) => {
          callOrder.push('db');
          if (typeof cb === 'function') return cb(mockPrisma);
          return cb;
        }
      );

      // Deletion log phase setup
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          callOrder.push('markLog');
          return { id: 'log-1' };
        }
      );
      (mockClubDeletionLogService.markDeleted as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      expect(callOrder).toEqual(['s3', 'db', 'markLog']);
    });

    it('should delete S3 files for club files', async () => {
      // S3 phase: club has 2 files
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { file: { s3Key: 'clubs/club-1/file1.pdf' } },
        { file: { s3Key: 'clubs/club-1/file2.jpg' } },
      ]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });

      // DB phase
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      expect(mockS3Service.deleteObject).toHaveBeenCalledWith('clubs/club-1/file1.pdf');
      expect(mockS3Service.deleteObject).toHaveBeenCalledWith('clubs/club-1/file2.jpg');
    });

    it('should delete logo from S3 when present', async () => {
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: { s3Key: 'clubs/club-1/logo.png' },
      });

      // DB phase
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: 'file-logo',
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      expect(mockS3Service.deleteObject).toHaveBeenCalledWith('clubs/club-1/logo.png');
    });

    it('should continue DB deletion when S3 deletion fails', async () => {
      // S3 phase: one file that fails
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { file: { s3Key: 'clubs/club-1/file1.pdf' } },
      ]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });
      (mockS3Service.deleteObject as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('S3 timeout')
      );

      // DB phase setup
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Should NOT throw — S3 errors are non-blocking
      await expect(
        service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club')
      ).resolves.toBeUndefined();

      // DB transaction should still have been called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw when club is already deleted (race condition)', async () => {
      // S3 phase
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });

      // DB phase: findFirst returns null (already deleted or not deactivated)
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club')
      ).rejects.toThrow('not eligible for deletion');
    });

    it('should use $transaction for DB deletion', async () => {
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should soft-delete club row with system user and clear deactivation fields', async () => {
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      // Second call to club.update is the soft-delete (first is clearing defaultMembershipTypeId)
      const updateCalls = (mockPrisma.club.update as ReturnType<typeof vi.fn>).mock.calls;
      const softDeleteCall = updateCalls.find(
        (call: unknown[]) =>
          (call[0] as Record<string, unknown>).data &&
          ((call[0] as Record<string, Record<string, unknown>>).data as Record<string, unknown>)
            .deletedBy === SYSTEM_USER_ID
      );

      expect(softDeleteCall).toBeDefined();
      expect(softDeleteCall![0]).toEqual(
        expect.objectContaining({
          where: { id: 'club-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            deletedBy: SYSTEM_USER_ID,
            deactivatedAt: null,
            deactivatedBy: null,
            scheduledDeletionAt: null,
            gracePeriodDays: null,
            logoFileId: null,
          }),
        })
      );
    });

    it('should mark deletion log as complete', async () => {
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });

      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'log-1',
      });
      (mockClubDeletionLogService.markDeleted as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      expect(mockClubDeletionLogService.findBySlug).toHaveBeenCalledWith('test-club');
      expect(mockClubDeletionLogService.markDeleted).toHaveBeenCalledWith('log-1');
    });

    it('should delete children before parents (members have MembershipPeriods)', async () => {
      (mockPrisma.clubFile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPrisma.club.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        logoFile: null,
      });
      (mockPrisma.club.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'club-1',
        deactivatedAt: new Date(),
        deletedAt: null,
        logoFileId: null,
      });

      const deleteOrder: string[] = [];
      (mockPrisma.memberStatusTransition.deleteMany as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          deleteOrder.push('memberStatusTransition');
          return { count: 0 };
        }
      );
      (mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'member-1' },
      ]);
      (mockPrisma.membershipPeriod.deleteMany as ReturnType<typeof vi.fn>).mockImplementation(
        async () => {
          deleteOrder.push('membershipPeriod');
          return { count: 0 };
        }
      );
      (mockPrisma.member.deleteMany as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        deleteOrder.push('member');
        return { count: 0 };
      });
      (mockPrisma.household.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.numberRange.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.club.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.membershipType.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.accessRequest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockPrisma.clubUser.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.auditLog.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
      (mockPrisma.ledgerAccount.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });
      (mockClubDeletionLogService.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await service.permanentlyDeleteClub('club-1', 'Test Club', 'test-club');

      // memberStatusTransition and membershipPeriod BEFORE member
      expect(deleteOrder.indexOf('memberStatusTransition')).toBeLessThan(
        deleteOrder.indexOf('member')
      );
      expect(deleteOrder.indexOf('membershipPeriod')).toBeLessThan(deleteOrder.indexOf('member'));
    });
  });
});
