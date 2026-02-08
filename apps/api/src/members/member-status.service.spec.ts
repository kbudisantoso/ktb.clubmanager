import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberStatusService } from './member-status.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock forClub() scoped DB
const mockDb = {
  member: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  membershipPeriod: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
} as unknown as PrismaService;

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
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
    service = new MemberStatusService(mockPrisma);
  });

  describe('changeStatus()', () => {
    describe('valid transitions', () => {
      it('should allow PENDING -> ACTIVE', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));
        mockDb.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'ACTIVE',
          'Aufgenommen',
          'user-1'
        );

        expect(result.status).toBe('ACTIVE');
      });

      it('should allow PENDING -> LEFT', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));
        mockDb.membershipPeriod.findFirst.mockResolvedValue(null);
        mockDb.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Abgelehnt',
          'user-1'
        );

        expect(result.status).toBe('LEFT');
      });

      it('should allow ACTIVE -> INACTIVE', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockDb.member.update.mockResolvedValue(makeMember({ status: 'INACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'INACTIVE',
          'Ruhend gestellt',
          'user-1'
        );

        expect(result.status).toBe('INACTIVE');
      });

      it('should allow ACTIVE -> LEFT and close period', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
        mockDb.membershipPeriod.findFirst.mockResolvedValue({
          id: 'period-1',
          leaveDate: null,
        });
        mockDb.membershipPeriod.update.mockResolvedValue({});
        mockDb.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await service.changeStatus('club-1', 'member-1', 'LEFT', 'Austritt', 'user-1');

        expect(mockDb.membershipPeriod.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'period-1' },
            data: { leaveDate: expect.any(Date) },
          })
        );
      });

      it('should allow INACTIVE -> ACTIVE', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'INACTIVE' }));
        mockDb.member.update.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'ACTIVE',
          'Reaktiviert',
          'user-1'
        );

        expect(result.status).toBe('ACTIVE');
      });

      it('should allow INACTIVE -> LEFT', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'INACTIVE' }));
        mockDb.membershipPeriod.findFirst.mockResolvedValue(null);
        mockDb.member.update.mockResolvedValue(makeMember({ status: 'LEFT' }));

        const result = await service.changeStatus(
          'club-1',
          'member-1',
          'LEFT',
          'Austritt',
          'user-1'
        );

        expect(result.status).toBe('LEFT');
      });
    });

    describe('invalid transitions', () => {
      it('should reject LEFT -> ACTIVE', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'ACTIVE', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject LEFT -> PENDING', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'LEFT' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'PENDING', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject ACTIVE -> PENDING', async () => {
        mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

        await expect(
          service.changeStatus('club-1', 'member-1', 'PENDING', 'Test', 'user-1')
        ).rejects.toThrow(BadRequestException);
      });
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStatus('club-1', 'member-1', 'ACTIVE', 'Test', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCancellation()', () => {
    it('should set cancellation dates without changing status', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
      mockDb.member.update.mockResolvedValue(
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
        'user-1'
      );

      expect(result.status).toBe('ACTIVE');
      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancellationDate: expect.any(Date),
            cancellationReceivedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should reject cancellation for PENDING member', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'PENDING' }));

      await expect(
        service.setCancellation('club-1', 'member-1', '2026-06-30', '2026-01-15', 'user-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkChangeStatus()', () => {
    it('should skip invalid transitions and return summary', async () => {
      // First member: valid transition
      mockDb.member.findFirst
        .mockResolvedValueOnce(makeMember({ id: 'member-1', status: 'ACTIVE' }))
        .mockResolvedValueOnce(makeMember({ id: 'member-2', status: 'LEFT' }));
      mockDb.member.update.mockResolvedValue(makeMember({ status: 'INACTIVE' }));

      const result = await service.bulkChangeStatus(
        'club-1',
        ['member-1', 'member-2'],
        'INACTIVE',
        'Bulk ruhend',
        'user-1'
      );

      expect(result.updated).toContain('member-1');
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]?.id).toBe('member-2');
    });
  });
});
