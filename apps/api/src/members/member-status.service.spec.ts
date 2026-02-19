import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberStatusService } from './member-status.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Transaction client mock — receives all calls inside $transaction
const mockTx = {
  member: {
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
  },
  membershipPeriod: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  memberStatusTransition: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(),
  $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  member: {
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  memberStatusTransition: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaService;

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    clubId: 'club-1',
    status: 'PENDING',
    cancellationDate: null,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Helper: set up chain mocks with specific transitions and member state.
 */
function setupChainMocks(
  cascadeDeleted: unknown[],
  chainTransitions: unknown[],
  allPeriods: unknown[],
  memberForSync: unknown
) {
  mockTx.memberStatusTransition.findMany
    .mockResolvedValueOnce(cascadeDeleted)
    .mockResolvedValueOnce(chainTransitions);
  // autoMaintainPeriodLeaveDates: all periods for the member
  mockTx.membershipPeriod.findMany.mockResolvedValueOnce(allPeriods);
  mockTx.member.findFirst.mockResolvedValueOnce(memberForSync);
  mockTx.member.update.mockResolvedValueOnce(memberForSync);
}

describe('MemberStatusService', () => {
  let service: MemberStatusService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.member.findFirst.mockReset();
    mockTx.member.findFirstOrThrow.mockReset();
    mockTx.member.update.mockReset();
    mockTx.membershipPeriod.findFirst.mockReset();
    mockTx.membershipPeriod.findMany.mockReset();
    mockTx.membershipPeriod.update.mockReset();
    mockTx.membershipPeriod.create.mockReset();
    mockTx.memberStatusTransition.create.mockReset();
    mockTx.memberStatusTransition.findFirst.mockReset();
    mockTx.memberStatusTransition.findMany.mockReset();
    mockTx.memberStatusTransition.update.mockReset();
    service = new MemberStatusService(mockPrisma);
  });

  describe('changeStatus()', () => {
    describe('valid transitions (6-state lifecycle)', () => {
      it('should allow PENDING -> ACTIVE and create period without membershipTypeId', async () => {
        // findFirst for member lookup
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'PENDING' }));
        // chain for getStatusAtDate + one-per-day check
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([]);
        // create transition
        mockTx.memberStatusTransition.create.mockResolvedValueOnce({ id: 'trans-new' });
        // period lookup: all periods for finding period containing effective date
        mockTx.membershipPeriod.findMany.mockResolvedValueOnce([]);
        // period creation
        mockTx.membershipPeriod.create.mockResolvedValueOnce({});
        // recalculateChain mocks
        const newPeriod = {
          id: 'period-new',
          joinDate: new Date(),
          leaveDate: null,
          memberId: 'member-1',
        };
        setupChainMocks(
          [], // no cascade-deleted
          [
            {
              id: 'trans-new',
              toStatus: 'ACTIVE',
              effectiveDate: new Date(),
              reason: 'Aufgenommen',
              createdAt: new Date(),
            },
          ],
          [newPeriod], // all periods for autoMaintainPeriodLeaveDates
          makeMember({ status: 'PENDING' })
        );
        // findFirstOrThrow at the end
        mockTx.member.findFirstOrThrow.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'ACTIVE',
          'Aufgenommen',
          'user-1'
        );

        expect(result.status).toBe('ACTIVE');
        expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              toStatus: 'ACTIVE',
              reason: 'Aufgenommen',
            }),
          })
        );
        // fromStatus should NOT be in the create call
        const createCall = mockTx.memberStatusTransition.create.mock.calls[0]![0];
        expect(createCall.data).not.toHaveProperty('fromStatus');
        // Period should have been created even without membershipTypeId
        expect(mockTx.membershipPeriod.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              memberId: 'member-1',
            }),
          })
        );
        // The created period should NOT have membershipTypeId
        const periodCreateCall = mockTx.membershipPeriod.create.mock.calls[0]![0];
        expect(periodCreateCall.data).not.toHaveProperty('membershipTypeId');
      });

      it('should allow ACTIVE -> LEFT and trigger chain recalculation', async () => {
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
          { effectiveDate: new Date('2024-01-01'), toStatus: 'ACTIVE' },
        ]);
        mockTx.memberStatusTransition.create.mockResolvedValueOnce({ id: 'trans-left' });
        // recalculateChain: cascade-deleted, chain, periods
        mockTx.memberStatusTransition.findMany
          .mockResolvedValueOnce([]) // cascade-deleted
          .mockResolvedValueOnce([
            {
              id: 'trans-active',
              toStatus: 'ACTIVE',
              effectiveDate: new Date('2024-01-01'),
              reason: 'Aufgenommen',
              createdAt: new Date('2024-01-01'),
            },
            {
              id: 'trans-left',
              toStatus: 'LEFT',
              effectiveDate: new Date('2025-01-01'),
              reason: 'Austritt',
              createdAt: new Date(),
              leftCategory: 'VOLUNTARY',
            },
          ]);
        // open periods to close
        mockTx.membershipPeriod.findMany.mockResolvedValueOnce([
          { id: 'period-1', joinDate: new Date('2024-01-01'), leaveDate: null },
        ]);
        mockTx.membershipPeriod.update.mockResolvedValueOnce({});
        // syncMemberStatus
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));
        mockTx.member.update.mockResolvedValueOnce(makeMember({ status: 'LEFT' }));
        mockTx.member.findFirstOrThrow.mockResolvedValueOnce(makeMember({ status: 'LEFT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Austritt',
          'user-1',
          '2025-01-01',
          'VOLUNTARY'
        );

        expect(result.status).toBe('LEFT');
        // Period should have been closed by recalculateChain
        expect(mockTx.membershipPeriod.update).toHaveBeenCalled();
      });
    });

    describe('one-entry-per-day validation', () => {
      it('should reject when a real transition exists on the same date', async () => {
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));
        // Chain includes a real PENDING→ACTIVE transition on 2025-01-15
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
          { id: 'existing', toStatus: 'ACTIVE', effectiveDate: new Date('2025-01-15') },
        ]);

        await expect(
          service.changeStatus('club-1', 'member-1', 'LEFT', 'Test', 'user-1', '2025-01-15')
        ).rejects.toThrow('An diesem Datum existiert bereits ein Statuseintrag');
      });

      it('should replace a self-transition audit entry on the same date', async () => {
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));
        // Chain: ACTIVE on 01-01, then self-transition audit (ACTIVE→ACTIVE) on 01-15
        const activeTransition = {
          id: 'trans-active',
          toStatus: 'ACTIVE',
          effectiveDate: new Date('2025-01-01'),
        };
        const selfAudit = {
          id: 'self-audit',
          toStatus: 'ACTIVE',
          effectiveDate: new Date('2025-01-15'),
        };
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([activeTransition, selfAudit]);
        // create transition
        mockTx.memberStatusTransition.create.mockResolvedValueOnce({ id: 'trans-new' });
        // recalculateChain mocks
        const leftTransition = {
          id: 'trans-new',
          toStatus: 'LEFT',
          effectiveDate: new Date('2025-01-15'),
        };
        setupChainMocks([], [activeTransition, leftTransition], [], makeMember({ status: 'LEFT' }));

        await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Austritt',
          'user-1',
          '2025-01-15',
          'VOLUNTARY'
        );

        // Should have soft-deleted the self-transition audit entry
        expect(mockTx.memberStatusTransition.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'self-audit' },
            data: expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 'user-1' }),
          })
        );
      });
    });

    describe('chain-aware validation', () => {
      it('should validate against chain status at effective date, not member.status', async () => {
        // Member's current status is ACTIVE, but at the backdated date the chain says PENDING
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));
        // Chain: ACTIVE transition at 2025-03-01
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
          { effectiveDate: new Date('2025-03-01'), toStatus: 'ACTIVE' },
        ]);
        // At date 2025-01-01, chain status = PENDING → PENDING->DORMANT is invalid
        await expect(
          service.changeStatus('club-1', 'member-1', 'DORMANT', 'Test', 'user-1', '2025-01-01')
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('leftCategory validation', () => {
      it('should require leftCategory when transitioning to LEFT', async () => {
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
          { effectiveDate: new Date('2024-01-01'), toStatus: 'ACTIVE' },
        ]);

        await expect(
          service.changeStatus('club-1', 'member-1', 'LEFT', 'Austritt', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('invalid transitions', () => {
      it('should reject PENDING -> DORMANT', async () => {
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'PENDING' }));
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([]);

        await expect(
          service.changeStatus('club-1', 'member-1', 'DORMANT', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject PENDING -> SUSPENDED', async () => {
        mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ status: 'PENDING' }));
        mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([]);

        await expect(
          service.changeStatus('club-1', 'member-1', 'SUSPENDED', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockTx.member.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.changeStatus('club-1', 'member-1', 'ACTIVE', 'Test', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCancellation()', () => {
    it('should set cancellation for ACTIVE member with audit trail (future date)', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(
        makeMember({
          status: 'ACTIVE',
          cancellationDate: new Date('2026-06-30'),
        })
      );
      // After the transaction, setCancellation returns prisma.member.findFirstOrThrow for future dates
      (
        mockPrisma.member as unknown as { findFirstOrThrow: ReturnType<typeof vi.fn> }
      ).findFirstOrThrow.mockResolvedValueOnce(
        makeMember({ status: 'ACTIVE', cancellationDate: new Date('2026-06-30') })
      );

      const result = await service.setCancellation(
        'club-1',
        'member-1',
        '2026-06-30',
        '2026-01-15',
        'user-1',
        'Kündigung per Brief'
      );

      expect(result.status).toBe('ACTIVE');
      // Future cancellation creates self-transition audit entry
      expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: 'ACTIVE',
            reason: 'Kündigung per Brief',
          }),
        })
      );
      // fromStatus should NOT be in the create call
      const createCall = mockTx.memberStatusTransition.create.mock.calls[0]![0];
      expect(createCall.data).not.toHaveProperty('fromStatus');
    });

    it('should reject cancellation for PENDING member', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));

      await expect(
        service.setCancellation('club-1', 'member-1', '2026-06-30', '2026-01-15', 'user-1', 'Test')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject cancellation for LEFT member', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'LEFT' }));

      await expect(
        service.setCancellation('club-1', 'member-1', '2026-06-30', '2026-01-15', 'user-1', 'Test')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate cancellation', async () => {
      mockTx.member.findFirst.mockResolvedValue(
        makeMember({ status: 'ACTIVE', cancellationDate: new Date('2026-06-30') })
      );

      await expect(
        service.setCancellation(
          'club-1',
          'member-1',
          '2026-12-31',
          '2026-05-01',
          'user-1',
          'Nochmal'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeCancellation()', () => {
    it('should clear cancellation fields and soft-delete related transitions (future cancellation)', async () => {
      const cancellationDate = new Date('2026-06-30');
      const memberWithCancellation = makeMember({ status: 'ACTIVE', cancellationDate });

      // 1st findFirst: member lookup in revokeCancellation
      mockTx.member.findFirst.mockResolvedValueOnce(memberWithCancellation);
      // Related transitions at cancellation date
      mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
        { id: 'self-trans', toStatus: 'ACTIVE', effectiveDate: cancellationDate },
      ]);
      mockTx.memberStatusTransition.update.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(memberWithCancellation);
      // recalculateChain mocks (findFirst is consumed by syncMemberStatus)
      setupChainMocks([], [], [], makeMember({ status: 'ACTIVE' }));
      // Final findFirstOrThrow
      mockTx.member.findFirstOrThrow.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));

      await service.revokeCancellation('club-1', 'member-1', 'user-1', 'Zurueckgezogen');

      expect(mockTx.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancellationDate: null,
            cancellationReceivedAt: null,
          }),
        })
      );
      // Self-transition should be soft-deleted
      expect(mockTx.memberStatusTransition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'self-trans' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should revoke cancellation for LEFT member and restore previous status', async () => {
      const cancellationDate = new Date('2026-02-14');
      const leftMember = makeMember({
        status: 'LEFT',
        cancellationDate,
        cancellationReceivedAt: new Date(),
      });

      // 1st findFirst: member lookup in revokeCancellation
      mockTx.member.findFirst.mockResolvedValueOnce(leftMember);
      // LEFT transition at cancellation date
      mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
        { id: 'left-trans', toStatus: 'LEFT', effectiveDate: cancellationDate },
      ]);
      mockTx.memberStatusTransition.update.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(leftMember);
      // recalculateChain mocks — chain without LEFT returns ACTIVE
      setupChainMocks(
        [],
        [
          {
            id: 'trans-1',
            toStatus: 'ACTIVE',
            effectiveDate: new Date('2024-01-01'),
            reason: '',
            createdAt: new Date(),
          },
        ],
        [],
        makeMember({ status: 'ACTIVE' })
      );
      // Final findFirstOrThrow
      mockTx.member.findFirstOrThrow.mockResolvedValueOnce(makeMember({ status: 'ACTIVE' }));

      const result = await service.revokeCancellation('club-1', 'member-1', 'user-1', 'Irrtum');

      expect(result.status).toBe('ACTIVE');
      // LEFT transition should be soft-deleted
      expect(mockTx.memberStatusTransition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'left-trans' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should reject when no cancellation exists', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

      await expect(service.revokeCancellation('club-1', 'member-1', 'user-1', '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject when member not found', async () => {
      mockTx.member.findFirst.mockResolvedValue(null);

      await expect(service.revokeCancellation('club-1', 'member-1', 'user-1', '')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('bulkChangeStatus()', () => {
    it('should skip invalid transitions and return summary', async () => {
      // First call: valid ACTIVE->DORMANT
      mockTx.member.findFirst.mockResolvedValueOnce(
        makeMember({ id: 'member-1', status: 'ACTIVE' })
      );
      mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
        { effectiveDate: new Date('2024-01-01'), toStatus: 'ACTIVE' },
      ]);
      mockTx.memberStatusTransition.create.mockResolvedValueOnce({ id: 'trans-new' });
      // period lookup: all periods for finding period containing effective date
      const existingPeriod = {
        id: 'period-1',
        memberId: 'member-1',
        joinDate: new Date('2024-01-01'),
        leaveDate: null,
        membershipTypeId: null,
      };
      mockTx.membershipPeriod.findMany.mockResolvedValueOnce([existingPeriod]);
      setupChainMocks(
        [],
        [
          {
            id: 'trans-new',
            toStatus: 'DORMANT',
            effectiveDate: new Date(),
            reason: 'Test',
            createdAt: new Date(),
          },
        ],
        [existingPeriod], // all periods for autoMaintainPeriodLeaveDates
        makeMember({ status: 'ACTIVE' })
      );
      mockTx.member.findFirstOrThrow.mockResolvedValueOnce(makeMember({ status: 'DORMANT' }));

      // Second call: invalid LEFT->DORMANT
      mockTx.member.findFirst.mockResolvedValueOnce(makeMember({ id: 'member-2', status: 'LEFT' }));
      mockTx.memberStatusTransition.findMany.mockResolvedValueOnce([
        { effectiveDate: new Date('2024-01-01'), toStatus: 'LEFT' },
      ]);

      const result = await service.bulkChangeStatus(
        'club-1',
        ['member-1', 'member-2'],
        'DORMANT',
        'Bulk ruhend',
        'user-1'
      );

      expect(result.updated).toContain('member-1');
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]?.id).toBe('member-2');
    });
  });

  describe('getStatusHistory()', () => {
    it('should compute fromStatus on read by walking the chain', async () => {
      (
        mockPrisma.member as unknown as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue(makeMember());
      (
        mockPrisma.memberStatusTransition as unknown as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValue([
        {
          id: 'trans-1',
          memberId: 'member-1',
          clubId: 'club-1',
          toStatus: 'ACTIVE',
          reason: 'Aufgenommen',
          leftCategory: null,
          effectiveDate: new Date('2026-01-15'),
          actorId: 'user-1',
          createdAt: new Date('2026-01-15T10:00:00Z'),
        },
        {
          id: 'trans-2',
          memberId: 'member-1',
          clubId: 'club-1',
          toStatus: 'DORMANT',
          reason: 'Ruhend',
          leftCategory: null,
          effectiveDate: new Date('2026-06-01'),
          actorId: 'user-1',
          createdAt: new Date('2026-06-01T10:00:00Z'),
        },
      ]);

      const result = await service.getStatusHistory('club-1', 'member-1');

      expect(result).toHaveLength(2);
      // DESC order: latest first
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'trans-2',
          fromStatus: 'ACTIVE', // computed: PENDING->ACTIVE->DORMANT, so fromStatus of trans-2 = ACTIVE
          toStatus: 'DORMANT',
        })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          id: 'trans-1',
          fromStatus: 'PENDING', // computed: first entry, fromStatus = PENDING
          toStatus: 'ACTIVE',
        })
      );
    });

    it('should throw NotFoundException for non-existent member', async () => {
      (
        mockPrisma.member as unknown as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue(null);

      await expect(service.getStatusHistory('club-1', 'member-99')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteStatusHistoryEntry()', () => {
    it('should soft-delete and trigger chain recalculation', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      );

      mockTx.memberStatusTransition.findFirst.mockResolvedValueOnce({
        id: 'trans-1',
        memberId: 'member-1',
        clubId: 'club-1',
        toStatus: 'ACTIVE',
      });
      mockTx.memberStatusTransition.update.mockResolvedValueOnce({});
      // recalculateChain mocks
      setupChainMocks([], [], [], makeMember());

      const result = await service.deleteStatusHistoryEntry(
        'club-1',
        'member-1',
        'trans-1',
        'user-1'
      );

      expect(result).toEqual({ success: true });
      expect(mockTx.memberStatusTransition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trans-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            deletedBy: 'user-1',
          }),
        })
      );
    });

    it('should allow deleting any entry (not just non-latest)', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      );

      // This is the latest entry — should still be deletable (CCI handles consistency)
      mockTx.memberStatusTransition.findFirst.mockResolvedValueOnce({
        id: 'trans-latest',
        memberId: 'member-1',
        clubId: 'club-1',
        toStatus: 'ACTIVE',
      });
      mockTx.memberStatusTransition.update.mockResolvedValueOnce({});
      setupChainMocks([], [], [], makeMember());

      const result = await service.deleteStatusHistoryEntry(
        'club-1',
        'member-1',
        'trans-latest',
        'user-1'
      );

      expect(result).toEqual({ success: true });
    });

    it('should block deletion of LEFT transition when formal cancellation exists', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      );

      mockTx.memberStatusTransition.findFirst.mockResolvedValueOnce({
        id: 'left-trans',
        memberId: 'member-1',
        clubId: 'club-1',
        toStatus: 'LEFT',
      });
      // Member has formal cancellation (cancellationReceivedAt is set)
      mockTx.member.findFirst.mockResolvedValueOnce(
        makeMember({
          status: 'LEFT',
          cancellationDate: new Date('2026-02-14'),
          cancellationReceivedAt: new Date('2026-02-10'),
        })
      );

      await expect(
        service.deleteStatusHistoryEntry('club-1', 'member-1', 'left-trans', 'user-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion of LEFT transition without formal cancellation', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      );

      mockTx.memberStatusTransition.findFirst.mockResolvedValueOnce({
        id: 'left-trans',
        memberId: 'member-1',
        clubId: 'club-1',
        toStatus: 'LEFT',
      });
      // Member is LEFT but without formal cancellation (manual exit)
      mockTx.member.findFirst.mockResolvedValueOnce(
        makeMember({ status: 'LEFT', cancellationDate: null, cancellationReceivedAt: null })
      );
      mockTx.memberStatusTransition.update.mockResolvedValueOnce({});
      setupChainMocks([], [], [], makeMember({ status: 'ACTIVE' }));

      const result = await service.deleteStatusHistoryEntry(
        'club-1',
        'member-1',
        'left-trans',
        'user-1'
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe('updateStatusHistoryEntry()', () => {
    it('should validate one-entry-per-day when changing effectiveDate', async () => {
      (mockPrisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      );

      mockTx.memberStatusTransition.findFirst
        .mockResolvedValueOnce({
          id: 'trans-1',
          memberId: 'member-1',
          clubId: 'club-1',
          toStatus: 'ACTIVE',
        })
        .mockResolvedValueOnce({ id: 'existing-on-date' }); // existing entry on target date

      await expect(
        service.updateStatusHistoryEntry(
          'club-1',
          'member-1',
          'trans-1',
          { effectiveDate: '2025-06-01' },
          'user-1'
        )
      ).rejects.toThrow('An diesem Datum existiert bereits ein Statuseintrag');
    });
  });
});
