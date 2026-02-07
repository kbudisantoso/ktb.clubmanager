import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembersService } from './members.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NumberRangesService } from '../number-ranges/number-ranges.service.js';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

// Mock forClub() pattern — returns scoped DB mock
const mockDb = {
  member: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
} as unknown as PrismaService;

const mockNumberRanges = {
  generateNext: vi.fn(),
} as unknown as NumberRangesService;

/** Minimal member factory for test data */
function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-1',
    clubId: 'club-1',
    memberNumber: 'M-0001',
    personType: 'NATURAL',
    salutation: null,
    title: null,
    firstName: 'Max',
    lastName: 'Mustermann',
    nickname: null,
    organizationName: null,
    contactFirstName: null,
    contactLastName: null,
    department: null,
    position: null,
    vatId: null,
    street: 'Musterstr.',
    houseNumber: '1',
    addressExtra: null,
    postalCode: '12345',
    city: 'Berlin',
    country: 'DE',
    email: 'max@example.com',
    phone: null,
    mobile: null,
    notes: null,
    status: 'PENDING',
    statusChangedAt: new Date(),
    statusChangedBy: 'user-1',
    statusChangeReason: null,
    cancellationDate: null,
    cancellationReceivedAt: null,
    dsgvoRequestDate: null,
    anonymizedAt: null,
    anonymizedBy: null,
    userId: null,
    householdId: null,
    householdRole: null,
    household: null,
    membershipPeriods: [],
    deletedAt: null,
    deletedBy: null,
    deletionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MembersService(mockPrisma, mockNumberRanges);
  });

  describe('create()', () => {
    it('should create member with auto-generated number', async () => {
      (mockNumberRanges.generateNext as ReturnType<typeof vi.fn>).mockResolvedValue('M-0001');
      mockDb.member.create.mockResolvedValue(makeMember());

      const result = await service.create(
        'club-1',
        { firstName: 'Max', lastName: 'Mustermann' } as never,
        'user-1'
      );

      expect(mockNumberRanges.generateNext).toHaveBeenCalledWith('club-1', 'MEMBER');
      expect(result.memberNumber).toBe('M-0001');
    });

    it('should create member with manual number when provided', async () => {
      mockDb.member.findFirst.mockResolvedValue(null); // no duplicate
      mockDb.member.create.mockResolvedValue(makeMember({ memberNumber: 'CUSTOM-001' }));

      const result = await service.create(
        'club-1',
        { firstName: 'Max', lastName: 'Mustermann', memberNumber: 'CUSTOM-001' } as never,
        'user-1'
      );

      expect(mockNumberRanges.generateNext).not.toHaveBeenCalled();
      expect(result.memberNumber).toBe('CUSTOM-001');
    });

    it('should create first membership period when joinDate provided', async () => {
      (mockNumberRanges.generateNext as ReturnType<typeof vi.fn>).mockResolvedValue('M-0001');
      mockDb.member.create.mockResolvedValue(
        makeMember({
          membershipPeriods: [
            {
              id: 'period-1',
              joinDate: new Date('2025-01-01'),
              leaveDate: null,
              membershipType: 'FULL',
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        })
      );

      const result = await service.create(
        'club-1',
        {
          firstName: 'Max',
          lastName: 'Mustermann',
          joinDate: '2025-01-01',
          membershipType: 'FULL',
        } as never,
        'user-1'
      );

      expect(result.membershipPeriods).toHaveLength(1);
      expect(result.membershipPeriods[0].joinDate).toBe('2025-01-01');
    });

    it('should throw ConflictException for duplicate memberNumber', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember()); // existing member found

      await expect(
        service.create(
          'club-1',
          { firstName: 'Max', lastName: 'Mustermann', memberNumber: 'M-0001' } as never,
          'user-1'
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when number range not configured', async () => {
      (mockNumberRanges.generateNext as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not found')
      );

      await expect(
        service.create(
          'club-1',
          { firstName: 'Max', lastName: 'Mustermann' } as never,
          'user-1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll()', () => {
    it('should return paginated results with cursor', async () => {
      const members = [makeMember({ id: 'member-1' }), makeMember({ id: 'member-2' })];
      mockDb.member.findMany.mockResolvedValue(members);
      mockDb.member.count.mockResolvedValue(2);

      const result = await service.findAll('club-1', { limit: 50 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.totalCount).toBe(2);
    });

    it('should detect hasMore when results exceed limit', async () => {
      // limit+1 items returned => hasMore=true
      const members = [
        makeMember({ id: 'member-1' }),
        makeMember({ id: 'member-2' }),
        makeMember({ id: 'member-3' }),
      ];
      mockDb.member.findMany.mockResolvedValue(members);
      mockDb.member.count.mockResolvedValue(10);

      const result = await service.findAll('club-1', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('member-2');
    });

    it('should filter by search term (case insensitive)', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { search: 'max' });

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                firstName: { contains: 'max', mode: 'insensitive' },
              }),
            ]),
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { status: 'ACTIVE' } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('findOne()', () => {
    it('should return member with relations', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember());

      const result = await service.findOne('club-1', 'member-1');

      expect(result.id).toBe('member-1');
      expect(result.firstName).toBe('Max');
    });

    it('should throw NotFoundException for deleted member', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(service.findOne('club-1', 'member-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should update member fields', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember());
      mockDb.member.update.mockResolvedValue(makeMember({ lastName: 'Updated' }));

      const result = await service.update(
        'club-1',
        'member-1',
        { lastName: 'Updated' } as never,
        'user-1'
      );

      expect(result.lastName).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.update('club-1', 'member-1', { lastName: 'Test' } as never, 'user-1')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt and reason when status is LEFT', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'LEFT' }));
      mockDb.member.update.mockResolvedValue(
        makeMember({ status: 'LEFT', deletedAt: new Date(), deletionReason: 'AUSTRITT' })
      );

      const result = await service.softDelete('club-1', 'member-1', 'user-1', 'AUSTRITT');

      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            deletedBy: 'user-1',
            deletionReason: 'AUSTRITT',
          }),
        })
      );
      expect(result.deletionReason).toBe('AUSTRITT');
    });

    it('should throw when status is not LEFT', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

      await expect(
        service.softDelete('club-1', 'member-1', 'user-1', 'AUSTRITT')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore()', () => {
    it('should clear deletedAt', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ deletedAt: new Date() }));
      mockDb.member.update.mockResolvedValue(makeMember({ deletedAt: null }));

      const result = await service.restore('club-1', 'member-1');

      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
          }),
        })
      );
      expect(result.deletedAt).toBeNull();
    });

    it('should throw NotFoundException if no deleted member found', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(service.restore('club-1', 'member-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hardDelete()', () => {
    it('should permanently delete member with no periods', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ membershipPeriods: [] }));
      mockDb.member.delete.mockResolvedValue({});

      const result = await service.hardDelete('club-1', 'member-1');

      expect(result.deleted).toBe(true);
    });

    it('should throw when periods exist', async () => {
      mockDb.member.findFirst.mockResolvedValue(
        makeMember({
          membershipPeriods: [{ id: 'period-1' }],
        })
      );

      await expect(service.hardDelete('club-1', 'member-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('anonymize()', () => {
    it('should replace personal fields with Anonymisiert', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'LEFT' }));
      mockDb.member.update.mockResolvedValue(
        makeMember({
          status: 'LEFT',
          firstName: 'Anonymisiert',
          lastName: 'Anonymisiert',
          email: null,
          anonymizedAt: new Date(),
        })
      );

      const result = await service.anonymize('club-1', 'member-1', 'user-1');

      expect(result.firstName).toBe('Anonymisiert');
      expect(result.lastName).toBe('Anonymisiert');
      expect(result.email).toBeNull();
    });

    it('should throw when status is not LEFT', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));

      await expect(service.anonymize('club-1', 'member-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw when already anonymized', async () => {
      mockDb.member.findFirst.mockResolvedValue(
        makeMember({ status: 'LEFT', anonymizedAt: new Date() })
      );

      await expect(service.anonymize('club-1', 'member-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
