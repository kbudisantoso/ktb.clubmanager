import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessRequestsService } from './access-requests.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

// Mock PrismaService
const mockPrisma = {
  club: {
    findFirst: vi.fn(),
  },
  clubUser: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  accessRequest: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('AccessRequestsService', () => {
  let service: AccessRequestsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccessRequestsService(mockPrisma as unknown as PrismaService);
  });

  describe('joinWithCode()', () => {
    const userId = 'user-123';
    // Valid code uses only allowed alphabet: ABCDEFGHJKMNPQRSTUVWXYZ23456789 (no 0, O, 1, I, L)
    const validCode = 'HXNK4P9M';

    describe('sunshine path', () => {
      it('should create access request with valid code', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.create.mockResolvedValue({});

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe('Deine Anfrage wurde gesendet.');
        expect(result.status).toBe('request_sent');
        expect(result.club).toMatchObject({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        expect(mockPrisma.accessRequest.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId,
            clubId: 'club-1',
            message: 'Beitritt über Einladungscode',
          }),
        });
      });

      it('should normalize invite code format', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.clubUser.create.mockResolvedValue({});

        await service.joinWithCode(userId, 'hxnk-4p9m');

        // Should still find the club (normalized to uppercase, no hyphen)
        expect(mockPrisma.club.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              inviteCode: 'HXNK4P9M',
            }),
          }),
        );
      });
    });

    describe('edge cases', () => {
      it('should inform user about pending/suspended membership', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          id: 'membership-1',
          status: 'SUSPENDED',
        });

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe('Deine Anfrage wird noch bearbeitet');
        expect(result.status).toBe('pending');
        // Should NOT create or update anything - just return info
        expect(mockPrisma.clubUser.update).not.toHaveBeenCalled();
        expect(mockPrisma.accessRequest.create).not.toHaveBeenCalled();
      });

      it('should return message if already active member', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          id: 'membership-1',
          status: 'ACTIVE',
        });

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe('Du bist bereits Mitglied dieses Vereins');
        expect(mockPrisma.clubUser.create).not.toHaveBeenCalled();
      });

      it('should return pending status if request already pending', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'PENDING',
        });

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe(
          'Du hast bereits eine Anfrage für diesen Verein gestellt',
        );
        expect(result.status).toBe('pending');
        expect(mockPrisma.accessRequest.create).not.toHaveBeenCalled();
        expect(mockPrisma.accessRequest.update).not.toHaveBeenCalled();
      });

      it('should allow resubmission after REJECTED request', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'REJECTED',
          rejectionReason: 'BOARD_ONLY',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({});

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe('Deine Anfrage wurde erneut gesendet.');
        expect(result.status).toBe('request_sent');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: 'existing-request' },
          data: expect.objectContaining({
            status: 'PENDING',
            rejectionReason: null,
            rejectionNote: null,
          }),
        });
        // Should NOT create a new request
        expect(mockPrisma.accessRequest.create).not.toHaveBeenCalled();
      });

      it('should allow resubmission after EXPIRED request', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'EXPIRED',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({});

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe('Deine Anfrage wurde erneut gesendet.');
        expect(result.status).toBe('request_sent');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: 'existing-request' },
          data: expect.objectContaining({
            status: 'PENDING',
            message: 'Beitritt über Einladungscode (erneute Anfrage)',
          }),
        });
      });

      it('should allow rejoin after leaving club (APPROVED request, no membership)', async () => {
        // Regression test: User was approved, left the club (ClubUser deleted),
        // then tries to rejoin. Should allow resubmission, not say "already approved".
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null); // No membership (left club)
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'APPROVED', // Old approved request still exists
        });
        mockPrisma.accessRequest.update.mockResolvedValue({});

        const result = await service.joinWithCode(userId, validCode);

        expect(result.message).toBe('Deine Anfrage wurde erneut gesendet.');
        expect(result.status).toBe('request_sent');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: 'existing-request' },
          data: expect.objectContaining({
            status: 'PENDING',
            message: 'Beitritt über Einladungscode (Wiedereintritt)',
          }),
        });
      });
    });

    describe('error cases', () => {
      it('should fail for invalid code format', async () => {
        // Code with invalid character (1 is not in alphabet)
        await expect(
          service.joinWithCode(userId, 'ABCD1234'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail for too short code', async () => {
        await expect(
          service.joinWithCode(userId, 'HXNK'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail for non-existent code', async () => {
        mockPrisma.club.findFirst.mockResolvedValue(null);

        await expect(
          service.joinWithCode(userId, validCode),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('requestAccess()', () => {
    const userId = 'user-123';
    const clubSlug = 'test-club';

    describe('sunshine path', () => {
      it('should create pending request', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.create.mockResolvedValue({
          id: 'request-1',
          status: 'PENDING',
          club: { id: 'club-1', name: 'Test Club', slug: 'test-club' },
        });

        const result = await service.requestAccess(userId, clubSlug);

        expect(result.message).toBe('Anfrage wurde gesendet');
        expect(result.request).toMatchObject({
          id: 'request-1',
          status: 'PENDING',
        });
      });

      it('should include optional message', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.create.mockResolvedValue({
          id: 'request-1',
          status: 'PENDING',
          message: 'Please let me in!',
          club: { id: 'club-1', name: 'Test Club', slug: 'test-club' },
        });

        await service.requestAccess(userId, clubSlug, 'Please let me in!');

        expect(mockPrisma.accessRequest.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              message: 'Please let me in!',
            }),
          }),
        );
      });

      it('should set 30-day expiry', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.create.mockResolvedValue({
          id: 'request-1',
          status: 'PENDING',
          club: { id: 'club-1', name: 'Test Club', slug: 'test-club' },
        });

        await service.requestAccess(userId, clubSlug);

        expect(mockPrisma.accessRequest.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              expiresAt: expect.any(Date),
            }),
          }),
        );
      });
    });

    describe('resubmission after rejection/expiry', () => {
      it('should allow resubmission after REJECTED request', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'REJECTED',
          rejectionReason: 'BOARD_ONLY',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({
          id: 'existing-request',
          status: 'PENDING',
          club: { id: 'club-1', name: 'Test Club', slug: 'test-club' },
        });

        const result = await service.requestAccess(
          userId,
          clubSlug,
          'Erneute Anfrage',
        );

        expect(result.message).toBe('Anfrage wurde erneut gesendet');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: 'existing-request' },
          data: expect.objectContaining({
            status: 'PENDING',
            message: 'Erneute Anfrage',
            rejectionReason: null,
            rejectionNote: null,
          }),
          include: expect.any(Object),
        });
        // Should NOT create a new request
        expect(mockPrisma.accessRequest.create).not.toHaveBeenCalled();
      });

      it('should allow resubmission after EXPIRED request', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'EXPIRED',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({
          id: 'existing-request',
          status: 'PENDING',
          club: { id: 'club-1', name: 'Test Club', slug: 'test-club' },
        });

        const result = await service.requestAccess(userId, clubSlug);

        expect(result.message).toBe('Anfrage wurde erneut gesendet');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: 'existing-request' },
          data: expect.objectContaining({
            status: 'PENDING',
            message: 'Erneute Anfrage',
          }),
          include: expect.any(Object),
        });
      });

      it('should allow rejoin after leaving club (APPROVED request, no membership)', async () => {
        // Regression test: User was approved, left the club (ClubUser deleted),
        // then tries to rejoin via public request. Should allow resubmission.
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null); // No membership (left club)
        mockPrisma.accessRequest.count.mockResolvedValue(0);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'APPROVED', // Old approved request still exists
        });
        mockPrisma.accessRequest.update.mockResolvedValue({
          id: 'existing-request',
          status: 'PENDING',
          club: { id: 'club-1', name: 'Test Club', slug: 'test-club' },
        });

        const result = await service.requestAccess(userId, clubSlug);

        expect(result.message).toBe('Anfrage wurde erneut gesendet');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: 'existing-request' },
          data: expect.objectContaining({
            status: 'PENDING',
            message: 'Wiedereintritt',
          }),
          include: expect.any(Object),
        });
      });
    });

    describe('error cases', () => {
      it('should fail for private clubs', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PRIVATE',
        });

        await expect(
          service.requestAccess(userId, clubSlug),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail at 5 pending request limit', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(5);

        await expect(
          service.requestAccess(userId, clubSlug),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail if already a member', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          id: 'membership-1',
          status: 'ACTIVE',
        });

        await expect(
          service.requestAccess(userId, clubSlug),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail if pending request already exists', async () => {
        mockPrisma.club.findFirst.mockResolvedValue({
          id: 'club-1',
          visibility: 'PUBLIC',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);
        mockPrisma.accessRequest.count.mockResolvedValue(1);
        mockPrisma.accessRequest.findFirst.mockResolvedValue({
          id: 'existing-request',
          status: 'PENDING',
        });

        await expect(
          service.requestAccess(userId, clubSlug),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail for non-existent club', async () => {
        mockPrisma.club.findFirst.mockResolvedValue(null);

        await expect(
          service.requestAccess(userId, clubSlug),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('approve()', () => {
    const requestId = 'request-123';
    const adminUserId = 'admin-user';

    describe('sunshine path', () => {
      it('should create ClubUser and update request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId: 'user-123',
          clubId: 'club-1',
          status: 'PENDING',
          club: { id: 'club-1' },
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          roles: ['ADMIN'],
          status: 'ACTIVE',
        });
        mockPrisma.$transaction.mockResolvedValue([]);

        const result = await service.approve(requestId, ['MEMBER'], adminUserId);

        expect(result.message).toBe('Anfrage genehmigt');
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('should allow OWNER to approve', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId: 'user-123',
          clubId: 'club-1',
          status: 'PENDING',
          club: { id: 'club-1' },
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          roles: ['OWNER'],
          status: 'ACTIVE',
        });
        mockPrisma.$transaction.mockResolvedValue([]);

        const result = await service.approve(requestId, ['MEMBER'], adminUserId);

        expect(result.message).toBe('Anfrage genehmigt');
      });
    });

    describe('error cases', () => {
      it('should fail for already processed request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          status: 'APPROVED',
        });

        await expect(
          service.approve(requestId, ['MEMBER'], adminUserId),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail without admin role', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId: 'user-123',
          clubId: 'club-1',
          status: 'PENDING',
          club: { id: 'club-1' },
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);

        await expect(
          service.approve(requestId, ['MEMBER'], adminUserId),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should fail for non-existent request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue(null);

        await expect(
          service.approve(requestId, ['MEMBER'], adminUserId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('reject()', () => {
    const requestId = 'request-123';
    const adminUserId = 'admin-user';

    describe('sunshine path', () => {
      it('should update request with reason', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          clubId: 'club-1',
          status: 'PENDING',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          roles: ['ADMIN'],
          status: 'ACTIVE',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({});

        const result = await service.reject(
          requestId,
          'BOARD_ONLY',
          undefined,
          adminUserId,
        );

        expect(result.message).toBe('Anfrage abgelehnt');
        expect(result.displayReason).toBe('Nur Vorstandsmitglieder haben Zugang');
      });

      it('should accept OTHER reason with note', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          clubId: 'club-1',
          status: 'PENDING',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          roles: ['ADMIN'],
          status: 'ACTIVE',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({});

        const result = await service.reject(
          requestId,
          'OTHER',
          'Custom reason',
          adminUserId,
        );

        expect(result.message).toBe('Anfrage abgelehnt');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              rejectionReason: 'OTHER',
              rejectionNote: 'Custom reason',
            }),
          }),
        );
      });
    });

    describe('error cases', () => {
      it('should fail for OTHER reason without note', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          clubId: 'club-1',
          status: 'PENDING',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue({
          roles: ['ADMIN'],
          status: 'ACTIVE',
        });

        await expect(
          service.reject(requestId, 'OTHER', undefined, adminUserId),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail for already processed request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          status: 'REJECTED',
        });

        await expect(
          service.reject(requestId, 'BOARD_ONLY', undefined, adminUserId),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail without admin role', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          clubId: 'club-1',
          status: 'PENDING',
        });
        mockPrisma.clubUser.findFirst.mockResolvedValue(null);

        await expect(
          service.reject(requestId, 'BOARD_ONLY', undefined, adminUserId),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('cancelRequest()', () => {
    const requestId = 'request-123';
    const userId = 'user-123';

    it('should allow user to cancel own pending request', async () => {
      mockPrisma.accessRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        status: 'PENDING',
      });
      mockPrisma.accessRequest.delete.mockResolvedValue({});

      const result = await service.cancelRequest(requestId, userId);

      expect(result.message).toBe('Anfrage zuruckgezogen');
      expect(mockPrisma.accessRequest.delete).toHaveBeenCalledWith({
        where: { id: requestId },
      });
    });

    it('should fail for other users request', async () => {
      mockPrisma.accessRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId: 'other-user',
        status: 'PENDING',
      });

      await expect(
        service.cancelRequest(requestId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail for non-pending request', async () => {
      mockPrisma.accessRequest.findUnique.mockResolvedValue({
        id: requestId,
        userId,
        status: 'APPROVED',
      });

      await expect(
        service.cancelRequest(requestId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should fail for non-existent request', async () => {
      mockPrisma.accessRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelRequest(requestId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyRequests()', () => {
    const userId = 'user-123';

    it('should return user requests ordered by date', async () => {
      mockPrisma.accessRequest.findMany.mockResolvedValue([
        {
          id: 'request-1',
          status: 'PENDING',
          club: { id: 'club-1', name: 'Club One', slug: 'club-one' },
        },
        {
          id: 'request-2',
          status: 'APPROVED',
          club: { id: 'club-2', name: 'Club Two', slug: 'club-two' },
        },
      ]);

      const result = await service.getMyRequests(userId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.accessRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      );
    });
  });

  describe('getClubRequests()', () => {
    const adminUserId = 'admin-user';

    it('should return pending requests for admins', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['ADMIN'],
        status: 'ACTIVE',
      });
      mockPrisma.accessRequest.findMany.mockResolvedValue([
        {
          id: 'request-1',
          status: 'PENDING',
          user: { id: 'user-1', name: 'User One', email: 'one@test.de' },
        },
      ]);

      const result = await service.getClubRequests('test-club', adminUserId);

      expect(result).toHaveLength(1);
    });

    it('should fail without admin role', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue(null);

      await expect(
        service.getClubRequests('test-club', adminUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fail for non-existent club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue(null);

      await expect(
        service.getClubRequests('nonexistent', adminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsSeen()', () => {
    const requestId = 'request-123';
    const userId = 'user-123';

    describe('sunshine path', () => {
      it('should mark rejected request as seen', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId,
          status: 'REJECTED',
        });
        mockPrisma.accessRequest.update.mockResolvedValue({});

        const result = await service.markAsSeen(requestId, userId);

        expect(result.message).toBe('Gelesen');
        expect(mockPrisma.accessRequest.update).toHaveBeenCalledWith({
          where: { id: requestId },
          data: { seenAt: expect.any(Date) },
        });
      });
    });

    describe('error cases', () => {
      it('should fail for non-existent request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue(null);

        await expect(
          service.markAsSeen(requestId, userId),
        ).rejects.toThrow(NotFoundException);
      });

      it('should fail for other users request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId: 'other-user',
          status: 'REJECTED',
        });

        await expect(
          service.markAsSeen(requestId, userId),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should fail for non-rejected request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId,
          status: 'PENDING',
        });

        await expect(
          service.markAsSeen(requestId, userId),
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail for approved request', async () => {
        mockPrisma.accessRequest.findUnique.mockResolvedValue({
          id: requestId,
          userId,
          status: 'APPROVED',
        });

        await expect(
          service.markAsSeen(requestId, userId),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
