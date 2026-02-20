import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MembersService } from './members.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NumberRangesService } from '../number-ranges/number-ranges.service.js';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client/index.js';

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
  membershipPeriod: {
    updateMany: vi.fn(),
  },
};

const mockPrisma = {
  forClub: vi.fn(() => mockDb),
  clubUser: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
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
    version: 0,
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
              membershipTypeId: 'type-1',
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
          membershipTypeId: 'type-1',
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
        service.create('club-1', { firstName: 'Max', lastName: 'Mustermann' } as never, 'user-1')
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

    it('should filter by single status without IN clause (backwards compat)', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { status: ['ACTIVE'] } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by multiple statuses using IN clause', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { status: ['ACTIVE', 'PENDING'] } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['ACTIVE', 'PENDING'] },
          }),
        })
      );
    });

    it('should filter members with any household (HAS)', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { householdFilter: 'HAS' } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            householdId: { not: null },
          }),
        })
      );
    });

    it('should filter members without household (NONE)', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { householdFilter: 'NONE' } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            householdId: null,
          }),
        })
      );
    });

    it('should filter by specific household IDs', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { householdFilter: 'id1,id2' } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            householdId: { in: ['id1', 'id2'] },
          }),
        })
      );
    });

    it('should filter by period year — members with overlapping membership period', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', { periodYear: 2025 } as never);

      expect(mockDb.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            membershipPeriods: {
              some: {
                joinDate: { lte: new Date('2025-12-31') },
                OR: [{ leaveDate: null }, { leaveDate: { gte: new Date('2025-01-01') } }],
              },
            },
          }),
        })
      );
    });

    it('should not add period filter when periodYear is undefined', async () => {
      mockDb.member.findMany.mockResolvedValue([]);
      mockDb.member.count.mockResolvedValue(0);

      await service.findAll('club-1', {});

      const callArgs = mockDb.member.findMany.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs.where).not.toHaveProperty('membershipPeriods');
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
    it('should update member fields with optimistic locking', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember());
      mockDb.member.update.mockResolvedValue(makeMember({ lastName: 'Updated', version: 1 }));

      const result = await service.update(
        'club-1',
        'member-1',
        { lastName: 'Updated', version: 0 } as never,
        'user-1'
      );

      expect(result.lastName).toBe('Updated');
      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-1', version: 0 },
          data: expect.objectContaining({
            version: { increment: 1 },
          }),
        })
      );
    });

    it('should throw ConflictException on version mismatch (P2025)', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember());
      mockDb.member.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '0.0.0',
        })
      );

      await expect(
        service.update('club-1', 'member-1', { lastName: 'Test', version: 99 } as never, 'user-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent member', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(
        service.update('club-1', 'member-1', { lastName: 'Test', version: 0 } as never, 'user-1')
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

    it('should allow soft delete regardless of status', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE' }));
      mockDb.member.update.mockResolvedValue(
        makeMember({ status: 'ACTIVE', deletedAt: new Date(), deletionReason: 'SONSTIGES' })
      );

      const result = await service.softDelete('club-1', 'member-1', 'user-1', 'SONSTIGES');
      expect(result.deletedAt).toBeTruthy();
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

      await expect(service.hardDelete('club-1', 'member-1')).rejects.toThrow(BadRequestException);
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

    it('should throw when status is not LEFT and not deleted', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ status: 'ACTIVE', deletedAt: null }));

      await expect(service.anonymize('club-1', 'member-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow anonymize when member is deleted', async () => {
      const deletedMember = makeMember({ status: 'ACTIVE', deletedAt: new Date() });
      mockDb.member.findFirst.mockResolvedValue(deletedMember);
      mockDb.member.update.mockResolvedValue(
        makeMember({
          status: 'ACTIVE',
          deletedAt: new Date(),
          firstName: 'Anonymisiert',
          lastName: 'Anonymisiert',
          anonymizedAt: new Date(),
        })
      );
      mockDb.membershipPeriod.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.anonymize('club-1', 'member-1', 'user-1');
      expect(result.firstName).toBe('Anonymisiert');
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

  describe('getLinkableUsers()', () => {
    function makeClubUser(overrides: Record<string, unknown> = {}) {
      return {
        id: 'cu-1',
        userId: 'user-1',
        clubId: 'club-1',
        status: 'ACTIVE',
        roles: ['MEMBER'],
        user: { id: 'user-1', name: 'Max Muster', email: 'max@test.com', image: null },
        ...overrides,
      };
    }

    it('should return ClubUsers not linked to other members (happy path)', async () => {
      const member = makeMember({ id: 'member-1', userId: null });
      mockDb.member.findFirst.mockResolvedValue(member);

      const cu1 = makeClubUser({ userId: 'user-1' });
      const cu2 = makeClubUser({
        id: 'cu-2',
        userId: 'user-2',
        user: { id: 'user-2', name: 'Erika', email: 'erika@test.com', image: null },
      });
      (
        mockPrisma.clubUser as unknown as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValue([cu1, cu2]);

      // user-1 is linked to another member
      mockDb.member.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      const result = await service.getLinkableUsers('club-1', 'member-1');

      expect(result.users).toHaveLength(1);
      expect(result.users[0]!.userId).toBe('user-2');
      expect(result.users[0]!.name).toBe('Erika');
    });

    it('should exclude users linked to other members in same club', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ id: 'member-1' }));
      (
        mockPrisma.clubUser as unknown as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValue([
        makeClubUser({ userId: 'user-1' }),
        makeClubUser({
          id: 'cu-2',
          userId: 'user-2',
          user: { id: 'user-2', name: 'Erika', email: 'e@t.com', image: null },
        }),
      ]);
      // Both users linked to other members
      mockDb.member.findMany.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]);

      const result = await service.getLinkableUsers('club-1', 'member-1');

      expect(result.users).toHaveLength(0);
    });

    it('should return member context (email, firstName, lastName)', async () => {
      mockDb.member.findFirst.mockResolvedValue(
        makeMember({
          id: 'member-1',
          email: 'max@example.com',
          firstName: 'Max',
          lastName: 'Mustermann',
        })
      );
      (
        mockPrisma.clubUser as unknown as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValue([]);
      mockDb.member.findMany.mockResolvedValue([]);

      const result = await service.getLinkableUsers('club-1', 'member-1');

      expect(result.member).toEqual({
        email: 'max@example.com',
        firstName: 'Max',
        lastName: 'Mustermann',
      });
    });

    it('should throw NotFoundException if member not found', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(service.getLinkableUsers('club-1', 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('linkUser()', () => {
    it('should link member to user (sets userId)', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ userId: null }));
      (
        mockPrisma.clubUser as unknown as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clubId: 'club-1',
        status: 'ACTIVE',
      });
      // No other member linked to this user
      mockDb.member.findFirst.mockResolvedValueOnce(makeMember({ userId: null })); // first call: member lookup
      mockDb.member.findFirst.mockResolvedValueOnce(null); // second call: duplicate check
      mockDb.member.update.mockResolvedValue(makeMember({ userId: 'user-1' }));

      const result = await service.linkUser('club-1', 'member-1', 'user-1');

      expect(result.userId).toBe('user-1');
      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 'user-1' },
        })
      );
    });

    it('should throw BadRequestException if user is not a ClubUser in this club', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember());
      (
        mockPrisma.clubUser as unknown as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue(null);

      await expect(service.linkUser('club-1', 'member-1', 'user-999')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ConflictException if user already linked to another member', async () => {
      mockDb.member.findFirst
        .mockResolvedValueOnce(makeMember({ id: 'member-1' })) // member lookup
        .mockResolvedValueOnce(
          makeMember({ id: 'member-other', memberNumber: 'M-0099', userId: 'user-1' })
        ); // duplicate check

      (
        mockPrisma.clubUser as unknown as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue({
        id: 'cu-1',
        userId: 'user-1',
        clubId: 'club-1',
        status: 'ACTIVE',
      });

      await expect(service.linkUser('club-1', 'member-1', 'user-1')).rejects.toThrow(
        ConflictException
      );
    });

    it('should unlink member when userId is null', async () => {
      mockDb.member.findFirst.mockResolvedValue(makeMember({ userId: 'user-1' }));
      mockDb.member.update.mockResolvedValue(makeMember({ userId: null }));

      const result = await service.linkUser('club-1', 'member-1', null);

      expect(result.userId).toBeNull();
      expect(mockDb.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: null },
        })
      );
    });

    it('should throw NotFoundException if member not found', async () => {
      mockDb.member.findFirst.mockResolvedValue(null);

      await expect(service.linkUser('club-1', 'nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
