import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HouseholdsService } from './households.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock forClub() scoped DB
const mockDb = {
  household: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  member: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
} as unknown as PrismaService;

function makeHousehold(overrides: Record<string, unknown> = {}) {
  return {
    id: 'household-1',
    clubId: 'club-1',
    name: 'Familie Mustermann',
    primaryContactId: 'member-1',
    deletedAt: null,
    deletedBy: null,
    members: [
      {
        id: 'member-1',
        firstName: 'Max',
        lastName: 'Mustermann',
        householdRole: 'HEAD',
        memberNumber: 'M-0001',
      },
      {
        id: 'member-2',
        firstName: 'Eva',
        lastName: 'Mustermann',
        householdRole: 'SPOUSE',
        memberNumber: 'M-0002',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('HouseholdsService', () => {
  let service: HouseholdsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HouseholdsService(mockPrisma);
  });

  describe('create()', () => {
    it('should create household with members and roles', async () => {
      const members = [
        { id: 'member-1', deletedAt: null },
        { id: 'member-2', deletedAt: null },
      ];
      mockDb.member.findMany.mockResolvedValue(members);
      mockDb.household.create.mockResolvedValue({
        id: 'household-1',
      });
      mockDb.member.update.mockResolvedValue({});

      // findOne for return value
      mockDb.household.findFirst.mockResolvedValue(makeHousehold());

      const result = await service.create(
        'club-1',
        {
          name: 'Familie Mustermann',
          memberIds: ['member-1', 'member-2'],
          roles: { 'member-1': 'HEAD', 'member-2': 'SPOUSE' },
          primaryContactId: 'member-1',
        } as never,
        'user-1'
      );

      expect(result.name).toBe('Familie Mustermann');
      expect(result.members).toHaveLength(2);
      expect(mockDb.member.update).toHaveBeenCalledTimes(2);
    });

    it('should throw when primaryContactId not in memberIds', async () => {
      await expect(
        service.create(
          'club-1',
          {
            name: 'Test',
            memberIds: ['member-1'],
            roles: { 'member-1': 'HEAD' },
            primaryContactId: 'member-99',
          } as never,
          'user-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when member not found', async () => {
      mockDb.member.findMany.mockResolvedValue([{ id: 'member-1' }]); // only 1 of 2

      await expect(
        service.create(
          'club-1',
          {
            name: 'Test',
            memberIds: ['member-1', 'member-2'],
            roles: { 'member-1': 'HEAD', 'member-2': 'SPOUSE' },
          } as never,
          'user-1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addMember()', () => {
    it('should add member to existing household', async () => {
      mockDb.household.findFirst.mockResolvedValue({ id: 'household-1', deletedAt: null });
      mockDb.member.findFirst
        .mockResolvedValueOnce({ id: 'member-3', householdId: null, deletedAt: null }) // addMember lookup
        .mockResolvedValueOnce(makeHousehold()); // findOne lookup
      mockDb.member.update.mockResolvedValue({});

      // findOne uses mockDb.household.findFirst on second call
      mockDb.household.findFirst
        .mockResolvedValueOnce({ id: 'household-1', deletedAt: null }) // validate
        .mockResolvedValueOnce(makeHousehold()); // findOne

      await service.addMember('club-1', 'household-1', 'member-3', 'CHILD');

      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            householdId: 'household-1',
            householdRole: 'CHILD',
          }),
        })
      );
    });
  });

  describe('removeMember()', () => {
    it('should remove non-HEAD member', async () => {
      mockDb.member.findFirst.mockResolvedValue({
        id: 'member-2',
        householdRole: 'SPOUSE',
        householdId: 'household-1',
        deletedAt: null,
      });
      mockDb.member.update.mockResolvedValue({});
      mockDb.member.count.mockResolvedValue(1); // still has members

      // findOne for return
      mockDb.household.findFirst.mockResolvedValue(makeHousehold());

      await service.removeMember('club-1', 'household-1', 'member-2', 'user-1');

      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            householdId: null,
            householdRole: null,
          }),
        })
      );
    });

    it('should throw when removing HEAD without reassignment', async () => {
      mockDb.member.findFirst.mockResolvedValue({
        id: 'member-1',
        householdRole: 'HEAD',
        householdId: 'household-1',
        deletedAt: null,
      });

      await expect(
        service.removeMember('club-1', 'household-1', 'member-1', 'user-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-delete household when last member removed', async () => {
      mockDb.member.findFirst.mockResolvedValue({
        id: 'member-2',
        householdRole: 'SPOUSE',
        householdId: 'household-1',
        deletedAt: null,
      });
      mockDb.member.update.mockResolvedValue({});
      mockDb.member.count.mockResolvedValue(0); // no members remaining
      mockDb.household.update.mockResolvedValue({});

      const result = await service.removeMember('club-1', 'household-1', 'member-2', 'user-1');

      expect(result).toEqual({ dissolved: true });
      expect(mockDb.household.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            deletedBy: 'user-1',
          }),
        })
      );
    });
  });

  describe('dissolve()', () => {
    it('should clear all member assignments and soft-delete household', async () => {
      mockDb.household.findFirst.mockResolvedValue(
        makeHousehold({
          members: [{ id: 'member-1' }, { id: 'member-2' }],
        })
      );
      mockDb.member.update.mockResolvedValue({});
      mockDb.household.update.mockResolvedValue({});

      const result = await service.dissolve('club-1', 'household-1', 'user-1');

      expect(result).toEqual({ dissolved: true });
      expect(mockDb.member.update).toHaveBeenCalledTimes(2);
      expect(mockDb.household.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw for non-existent household', async () => {
      mockDb.household.findFirst.mockResolvedValue(null);

      await expect(
        service.dissolve('club-1', 'household-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncAddresses()', () => {
    it('should copy address from source to targets', async () => {
      mockDb.member.findFirst.mockResolvedValue({
        id: 'member-1',
        householdId: 'household-1',
        deletedAt: null,
        street: 'Musterstr.',
        houseNumber: '1',
        addressExtra: null,
        postalCode: '12345',
        city: 'Berlin',
        country: 'DE',
      });
      mockDb.member.findMany.mockResolvedValue([{ id: 'member-2', householdId: 'household-1' }]);
      mockDb.member.update.mockResolvedValue({});

      const result = await service.syncAddresses(
        'club-1',
        'household-1',
        'member-1',
        ['member-2']
      );

      expect(result.updatedMemberIds).toContain('member-2');
      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            street: 'Musterstr.',
            city: 'Berlin',
          }),
        })
      );
    });

    it('should throw when source member not in household', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.syncAddresses('club-1', 'household-1', 'member-99', ['member-2'])
      ).rejects.toThrow(NotFoundException);
    });
  });
});
