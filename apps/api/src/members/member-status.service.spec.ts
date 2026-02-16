import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberStatusService } from './member-status.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Transaction client mock — receives all calls inside $transaction
const mockTx = {
  member: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  membershipPeriod: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  memberStatusTransition: {
    create: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(),
  $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  member: {
    findFirst: vi.fn(),
  },
  memberStatusTransition: {
    findMany: vi.fn(),
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

describe('MemberStatusService', () => {
  let service: MemberStatusService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.member.findFirst.mockReset();
    mockTx.member.update.mockReset();
    mockTx.membershipPeriod.findFirst.mockReset();
    mockTx.membershipPeriod.update.mockReset();
    mockTx.memberStatusTransition.create.mockReset();
    service = new MemberStatusService(mockPrisma);
  });

  describe('changeStatus()', () => {
    describe('valid transitions (6-state lifecycle)', () => {
      it('should allow PENDING -> ACTIVE', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

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
              fromStatus: 'PENDING',
              toStatus: 'ACTIVE',
              reason: 'Aufgenommen',
            }),
          })
        );
      });

      it('should allow PENDING -> PROBATION', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'PROBATION' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'PROBATION',
          'Probezeit',
          'user-1'
        );

        expect(result.status).toBe('PROBATION');
      });

      it('should allow PROBATION -> ACTIVE', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PROBATION' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'ACTIVE',
          'Probezeit bestanden',
          'user-1'
        );

        expect(result.status).toBe('ACTIVE');
      });

      it('should allow ACTIVE -> DORMANT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'DORMANT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'DORMANT',
          'Ruhend gestellt',
          'user-1'
        );

        expect(result.status).toBe('DORMANT');
      });

      it('should allow ACTIVE -> SUSPENDED', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'SUSPENDED' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'SUSPENDED',
          'Beitrag nicht bezahlt',
          'user-1'
        );

        expect(result.status).toBe('SUSPENDED');
      });

      it('should allow DORMANT -> ACTIVE', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'DORMANT' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'ACTIVE',
          'Reaktiviert',
          'user-1'
        );

        expect(result.status).toBe('ACTIVE');
      });

      it('should allow SUSPENDED -> ACTIVE', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'SUSPENDED' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'ACTIVE',
          'Sperre aufgehoben',
          'user-1'
        );

        expect(result.status).toBe('ACTIVE');
      });

      it('should allow SUSPENDED -> DORMANT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'SUSPENDED' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'DORMANT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'DORMANT',
          'In Ruhephase versetzt',
          'user-1'
        );

        expect(result.status).toBe('DORMANT');
      });

      it('should allow ACTIVE -> LEFT and close period', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.membershipPeriod.findFirst.mockResolvedValue({
          id: 'period-1',
          leaveDate: null,
        });
        mockTx.membershipPeriod.update.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Austritt',
          'user-1',
          undefined,
          'VOLUNTARY'
        );

        expect(mockTx.membershipPeriod.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'period-1' },
            data: { leaveDate: expect.any(Date) },
          })
        );
      });

      it('should allow PENDING -> LEFT with leftCategory', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.membershipPeriod.findFirst.mockResolvedValue(null);
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Abgelehnt',
          'user-1',
          undefined,
          'OTHER'
        );

        expect(result.status).toBe('LEFT');
      });

      it('should allow DORMANT -> LEFT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'DORMANT' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.membershipPeriod.findFirst.mockResolvedValue(null);
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Austritt',
          'user-1',
          undefined,
          'VOLUNTARY'
        );

        expect(result.status).toBe('LEFT');
      });

      it('should allow SUSPENDED -> LEFT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'SUSPENDED' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.membershipPeriod.findFirst.mockResolvedValue(null);
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Ausschluss',
          'user-1',
          undefined,
          'EXCLUSION'
        );

        expect(result.status).toBe('LEFT');
      });
    });

    describe('leftCategory validation', () => {
      it('should require leftCategory when transitioning to LEFT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'LEFT', 'Austritt', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept leftCategory with LEFT transition', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.membershipPeriod.findFirst.mockResolvedValue(null);
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await expect(
          service.changeStatus(
            'club-1',
            'member-1',
            'LEFT',
            'Austritt',
            'user-1',
            undefined,
            'VOLUNTARY'
          )
        ).resolves.toBeDefined();

        expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              leftCategory: 'VOLUNTARY',
            }),
          })
        );
      });
    });

    describe('audit trail', () => {
      it('should create MemberStatusTransition on every status change', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        await service.changeStatus('club-1', 'member-1', 'ACTIVE', 'Aufgenommen', 'user-1');

        expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith({
          data: {
            memberId: 'member-1',
            clubId: 'club-1',
            fromStatus: 'PENDING',
            toStatus: 'ACTIVE',
            reason: 'Aufgenommen',
            leftCategory: null,
            effectiveDate: expect.any(Date),
            actorId: 'user-1',
          },
        });
      });

      it('should store leftCategory in transition for LEFT status', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockTx.memberStatusTransition.create.mockResolvedValue({});
        mockTx.membershipPeriod.findFirst.mockResolvedValue(null);
        mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Todesfall',
          'user-1',
          undefined,
          'DEATH'
        );

        expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            leftCategory: 'DEATH',
          }),
        });
      });
    });

    describe('invalid transitions', () => {
      it('should reject ACTIVE -> PENDING', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'PENDING', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject ACTIVE -> PROBATION', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'PROBATION', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject PENDING -> DORMANT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'DORMANT', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject PENDING -> SUSPENDED', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'SUSPENDED', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject LEFT -> DORMANT', async () => {
        mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'DORMANT', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockTx.member.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStatus('club-1', 'member-1', 'ACTIVE', 'Test', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCancellation()', () => {
    it('should set cancellation for ACTIVE member with audit trail', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(
        makeMember({
          status: 'ACTIVE',
          cancellationDate: new Date('2026-06-30'),
        })
      );

      const result = await service.setCancellation(
        'club-1',
        'member-1',
        '2026-06-30',
        '2026-01-15',
        'user-1',
        'Kuendigung per Brief'
      );

      expect(result.status).toBe('ACTIVE');
      expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: 'ACTIVE',
            toStatus: 'ACTIVE',
            reason: 'Kuendigung per Brief',
          }),
        })
      );
    });

    it('should set cancellation for PROBATION member', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'PROBATION' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'PROBATION' }));

      await expect(
        service.setCancellation(
          'club-1',
          'member-1',
          '2026-06-30',
          '2026-01-15',
          'user-1',
          'Probezeit-Kuendigung'
        )
      ).resolves.toBeDefined();
    });

    it('should set cancellation for DORMANT member', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'DORMANT' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'DORMANT' }));

      await expect(
        service.setCancellation(
          'club-1',
          'member-1',
          '2026-06-30',
          '2026-01-15',
          'user-1',
          'Kuendigung waehrend Ruhephase'
        )
      ).resolves.toBeDefined();
    });

    it('should set cancellation for SUSPENDED member', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'SUSPENDED' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'SUSPENDED' }));

      await expect(
        service.setCancellation(
          'club-1',
          'member-1',
          '2026-06-30',
          '2026-01-15',
          'user-1',
          'Kuendigung trotz Sperre'
        )
      ).resolves.toBeDefined();
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

    it('should create audit trail for cancellation event', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

      await service.setCancellation(
        'club-1',
        'member-1',
        '2026-06-30',
        '2026-01-15',
        'user-1',
        'Kuendigung eingegangen'
      );

      expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith({
        data: {
          memberId: 'member-1',
          clubId: 'club-1',
          fromStatus: 'ACTIVE',
          toStatus: 'ACTIVE',
          reason: 'Kuendigung eingegangen',
          effectiveDate: expect.any(Date),
          actorId: 'user-1',
        },
      });
    });
  });

  describe('revokeCancellation()', () => {
    it('should clear cancellation fields and create audit trail', async () => {
      mockTx.member.findFirst.mockResolvedValue(
        makeMember({ status: 'ACTIVE', cancellationDate: new Date('2026-06-30') })
      );
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

      await service.revokeCancellation('club-1', 'member-1', 'user-1', 'Zurueckgezogen');

      expect(mockTx.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancellationDate: null,
            cancellationReceivedAt: null,
          }),
        })
      );
      expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: 'ACTIVE',
            toStatus: 'ACTIVE',
            reason: 'Zurueckgezogen',
          }),
        })
      );
    });

    it('should reject when no cancellation exists', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

      await expect(service.revokeCancellation('club-1', 'member-1', 'user-1', '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject when member is LEFT', async () => {
      mockTx.member.findFirst.mockResolvedValue(
        makeMember({ status: 'LEFT', cancellationDate: new Date('2026-01-01') })
      );

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
      // First member: valid transition (ACTIVE -> DORMANT)
      mockTx.member.findFirst
        .mockResolvedValueOnce(makeMember({ id: 'member-1', status: 'ACTIVE' }))
        .mockResolvedValueOnce(makeMember({ id: 'member-2', status: 'LEFT' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'DORMANT' }));

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

    it('should pass leftCategory to changeStatus for LEFT transitions', async () => {
      mockTx.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
      mockTx.memberStatusTransition.create.mockResolvedValue({});
      mockTx.membershipPeriod.findFirst.mockResolvedValue(null);
      mockTx.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

      await service.bulkChangeStatus(
        'club-1',
        ['member-1'],
        'LEFT',
        'Massenausschluss',
        'user-1',
        'EXCLUSION'
      );

      expect(mockTx.memberStatusTransition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leftCategory: 'EXCLUSION',
          }),
        })
      );
    });
  });

  describe('getStatusHistory()', () => {
    it('should return formatted transitions', async () => {
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
          fromStatus: 'PENDING',
          toStatus: 'ACTIVE',
          reason: 'Aufgenommen',
          leftCategory: null,
          effectiveDate: new Date('2026-01-15'),
          actorId: 'user-1',
          createdAt: new Date('2026-01-15T10:00:00Z'),
        },
      ]);

      const result = await service.getStatusHistory('club-1', 'member-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'trans-1',
        memberId: 'member-1',
        clubId: 'club-1',
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        reason: 'Aufgenommen',
        leftCategory: null,
        effectiveDate: '2026-01-15',
        actorId: 'user-1',
        createdAt: '2026-01-15T10:00:00.000Z',
      });
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
});
