import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubsService } from './clubs.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { AppSettingsService } from '../settings/app-settings.service.js';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';

// Mock PrismaService
const mockPrisma = {
  club: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  clubUser: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
};

// Mock AppSettingsService
const mockAppSettings = {
  isSelfServiceEnabled: vi.fn(),
  getDefaultTierId: vi.fn(),
  getDefaultVisibility: vi.fn(),
};

describe('ClubsService', () => {
  let service: ClubsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClubsService(
      mockPrisma as unknown as PrismaService,
      mockAppSettings as unknown as AppSettingsService
    );
  });

  describe('create()', () => {
    const userId = 'user-123';
    const createDto = { name: 'Test Club' };

    describe('sunshine path', () => {
      it('should generate slug from name', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockAppSettings.getDefaultTierId.mockResolvedValue('tier-1');
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        mockPrisma.club.findUnique.mockResolvedValue(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TC',
          avatarColor: 'blue',
          tierId: 'tier-1',
          tier: { id: 'tier-1', name: 'Basic' },
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        const result = await service.create(createDto, userId, false);

        expect(result.slug).toBe('test-club');
        expect(mockPrisma.club.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: 'Test Club',
              slug: 'test-club',
              clubUsers: {
                create: {
                  userId,
                  roles: ['OWNER'],
                  status: 'ACTIVE',
                },
              },
            }),
          })
        );
      });

      it('should generate invite code for private clubs', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockAppSettings.getDefaultTierId.mockResolvedValue('tier-1');
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        mockPrisma.club.findUnique.mockResolvedValue(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TC',
          avatarColor: 'blue',
          tierId: 'tier-1',
          tier: { id: 'tier-1', name: 'Basic' },
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        const result = await service.create(createDto, userId, false);

        expect(result.inviteCode).toBeDefined();
        expect(mockPrisma.club.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              inviteCode: expect.any(String),
            }),
          })
        );
      });

      it('should assign creator as OWNER', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockAppSettings.getDefaultTierId.mockResolvedValue(null);
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        mockPrisma.club.findUnique.mockResolvedValue(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TC',
          avatarColor: 'blue',
          tierId: null,
          tier: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        await service.create(createDto, userId, false);

        expect(mockPrisma.club.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              clubUsers: {
                create: {
                  userId,
                  roles: ['OWNER'],
                  status: 'ACTIVE',
                },
              },
            }),
          })
        );
      });

      it('should allow Super Admin to create club when self-service is disabled', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(false);
        mockAppSettings.getDefaultTierId.mockResolvedValue('tier-1');
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        mockPrisma.club.findUnique.mockResolvedValue(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TC',
          avatarColor: 'blue',
          tierId: 'tier-1',
          tier: { id: 'tier-1', name: 'Basic' },
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        const result = await service.create(createDto, userId, true);

        expect(result.id).toBe('club-1');
      });
    });

    describe('edge cases', () => {
      it('should use custom slug when provided', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockAppSettings.getDefaultTierId.mockResolvedValue(null);
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        mockPrisma.club.findUnique.mockResolvedValue(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'my-custom-slug',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TC',
          avatarColor: 'blue',
          tierId: null,
          tier: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        await service.create({ ...createDto, slug: 'my-custom-slug' }, userId, false);

        expect(mockPrisma.club.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              slug: 'my-custom-slug',
            }),
          })
        );
      });

      it('should retry with numeric suffix on slug collision', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockAppSettings.getDefaultTierId.mockResolvedValue(null);
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        // First call returns existing club, second returns null
        mockPrisma.club.findUnique
          .mockResolvedValueOnce({ id: 'existing-club', slug: 'test-club' })
          .mockResolvedValueOnce(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Test Club',
          slug: 'test-club-1',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TC',
          avatarColor: 'blue',
          tierId: null,
          tier: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        await service.create(createDto, userId, false);

        expect(mockPrisma.club.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              slug: 'test-club-1',
            }),
          })
        );
      });

      it('should generate initials from club name', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockAppSettings.getDefaultTierId.mockResolvedValue(null);
        mockAppSettings.getDefaultVisibility.mockResolvedValue('PRIVATE');
        mockPrisma.club.findUnique.mockResolvedValue(null);
        mockPrisma.club.create.mockResolvedValue({
          id: 'club-1',
          name: 'Turnverein Schwarz Weiss 1908',
          slug: 'turnverein-schwarz-weiss-1908',
          legalName: null,
          description: null,
          visibility: 'PRIVATE',
          inviteCode: 'ABCD1234',
          avatarUrl: null,
          avatarInitials: 'TSW',
          avatarColor: 'blue',
          tierId: null,
          tier: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { clubUsers: 1, members: 0 },
        });

        await service.create({ name: 'Turnverein Schwarz Weiss 1908' }, userId, false);

        expect(mockPrisma.club.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              avatarInitials: 'TSW',
            }),
          })
        );
      });
    });

    describe('error cases', () => {
      it('should fail when self-service disabled and not Super Admin', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(false);

        await expect(service.create(createDto, userId, false)).rejects.toThrow(ForbiddenException);
      });

      it('should fail for reserved slugs', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockPrisma.club.findUnique.mockResolvedValue(null);

        await expect(
          service.create({ name: 'Test', slug: 'admin' }, userId, false)
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail for invalid slug format', async () => {
        mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);
        mockPrisma.club.findUnique.mockResolvedValue(null);

        await expect(service.create({ name: 'Test', slug: 'ab' }, userId, false)).rejects.toThrow(
          BadRequestException
        );
      });
    });
  });

  describe('findMyClubs()', () => {
    const userId = 'user-123';

    it('should return only user clubs with roles', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([
        {
          roles: ['OWNER'],
          joinedAt: new Date(),
          club: {
            id: 'club-1',
            name: 'Club One',
            slug: 'club-one',
            legalName: null,
            description: null,
            visibility: 'PRIVATE',
            inviteCode: 'ABCD1234',
            avatarUrl: null,
            avatarInitials: 'CO',
            avatarColor: 'blue',
            tierId: null,
            tier: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { clubUsers: 2, members: 5 },
          },
        },
        {
          roles: ['MEMBER'],
          joinedAt: new Date(),
          club: {
            id: 'club-2',
            name: 'Club Two',
            slug: 'club-two',
            legalName: null,
            description: null,
            visibility: 'PUBLIC',
            inviteCode: null,
            avatarUrl: null,
            avatarInitials: 'CT',
            avatarColor: 'green',
            tierId: null,
            tier: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { clubUsers: 10, members: 100 },
          },
        },
      ]);

      mockAppSettings.isSelfServiceEnabled.mockResolvedValue(false);

      const result = await service.findMyClubs(userId, false);

      expect(result.clubs).toHaveLength(2);
      expect(result.clubs[0]).toMatchObject({
        id: 'club-1',
        name: 'Club One',
        roles: ['OWNER'],
      });
      expect(result.clubs[1]).toMatchObject({
        id: 'club-2',
        name: 'Club Two',
        roles: ['MEMBER'],
      });
      expect(result.meta.canCreateClub).toBe(false);
    });

    it('should return empty clubs array if user has no clubs', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockAppSettings.isSelfServiceEnabled.mockResolvedValue(true);

      const result = await service.findMyClubs(userId, false);

      expect(result.clubs).toEqual([]);
      expect(result.meta.canCreateClub).toBe(true);
    });

    it('should set canCreateClub true if user is super admin', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockAppSettings.isSelfServiceEnabled.mockResolvedValue(false);

      const result = await service.findMyClubs(userId, true);

      expect(result.meta.canCreateClub).toBe(true);
    });

    it('should filter by active status only', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockAppSettings.isSelfServiceEnabled.mockResolvedValue(false);

      await service.findMyClubs(userId, false);

      expect(mockPrisma.clubUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('checkSlugAvailability()', () => {
    it('should return available true for unused slug', async () => {
      mockPrisma.club.findUnique.mockResolvedValue(null);

      const result = await service.checkSlugAvailability('new-club');

      expect(result.available).toBe(true);
    });

    it('should return available false for existing slug', async () => {
      mockPrisma.club.findUnique.mockResolvedValue({ id: 'club-1', slug: 'existing-club' });

      const result = await service.checkSlugAvailability('existing-club');

      expect(result.available).toBe(false);
    });

    it('should return invalid for reserved slugs', async () => {
      const result = await service.checkSlugAvailability('admin');

      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should return invalid for malformed slugs', async () => {
      const result = await service.checkSlugAvailability('ab');

      expect(result.available).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('update()', () => {
    const userId = 'user-123';
    const updateDto = { name: 'Updated Name' };

    it('should allow OWNER to update club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['OWNER'],
        status: 'ACTIVE',
      });
      mockPrisma.club.update.mockResolvedValue({
        id: 'club-1',
        name: 'Updated Name',
        slug: 'test-club',
        legalName: null,
        description: null,
        visibility: 'PRIVATE',
        inviteCode: 'ABCD1234',
        avatarUrl: null,
        avatarInitials: 'UN',
        avatarColor: 'blue',
        tierId: null,
        tier: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { clubUsers: 1, members: 0 },
      });

      const result = await service.update('test-club', updateDto, userId, false);

      expect(result.name).toBe('Updated Name');
    });

    it('should allow ADMIN to update club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['ADMIN'],
        status: 'ACTIVE',
      });
      mockPrisma.club.update.mockResolvedValue({
        id: 'club-1',
        name: 'Updated Name',
        slug: 'test-club',
        legalName: null,
        description: null,
        visibility: 'PRIVATE',
        inviteCode: 'ABCD1234',
        avatarUrl: null,
        avatarInitials: 'UN',
        avatarColor: 'blue',
        tierId: null,
        tier: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { clubUsers: 1, members: 0 },
      });

      const result = await service.update('test-club', updateDto, userId, false);

      expect(result.name).toBe('Updated Name');
    });

    it('should allow Super Admin to update any club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.club.update.mockResolvedValue({
        id: 'club-1',
        name: 'Updated Name',
        slug: 'test-club',
        legalName: null,
        description: null,
        visibility: 'PRIVATE',
        inviteCode: 'ABCD1234',
        avatarUrl: null,
        avatarInitials: 'UN',
        avatarColor: 'blue',
        tierId: null,
        tier: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { clubUsers: 1, members: 0 },
      });

      const result = await service.update('test-club', updateDto, userId, true);

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.clubUser.findFirst).not.toHaveBeenCalled();
    });

    it('should fail for VIEWER role', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue(null);

      await expect(service.update('test-club', updateDto, userId, false)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should fail for non-existent club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto, userId, false)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove()', () => {
    const userId = 'user-123';

    it('should allow OWNER to delete club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['OWNER'],
        status: 'ACTIVE',
      });
      mockPrisma.club.update.mockResolvedValue({});

      await service.remove('test-club', userId, false);

      expect(mockPrisma.club.update).toHaveBeenCalledWith({
        where: { id: 'club-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: userId,
        }),
      });
    });

    it('should allow Super Admin to delete any club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.club.update.mockResolvedValue({});

      await service.remove('test-club', userId, true);

      expect(mockPrisma.clubUser.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.club.update).toHaveBeenCalled();
    });

    it('should fail for ADMIN role (only OWNER can delete)', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue(null);

      await expect(service.remove('test-club', userId, false)).rejects.toThrow(ForbiddenException);
    });

    it('should fail for non-existent club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue(null);

      await expect(service.remove('nonexistent', userId, false)).rejects.toThrow(NotFoundException);
    });
  });

  describe('leaveClub()', () => {
    const userId = 'user-123';

    it('should allow MEMBER to leave club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        id: 'membership-1',
        roles: ['MEMBER'],
        status: 'ACTIVE',
      });
      mockPrisma.clubUser.delete.mockResolvedValue({});

      const result = await service.leaveClub('test-club', userId);

      expect(result.message).toBe('Du hast den Verein verlassen');
      expect(mockPrisma.clubUser.delete).toHaveBeenCalledWith({
        where: { id: 'membership-1' },
      });
    });

    it('should allow ADMIN to leave club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        id: 'membership-1',
        roles: ['ADMIN'],
        status: 'ACTIVE',
      });
      mockPrisma.clubUser.delete.mockResolvedValue({});

      const result = await service.leaveClub('test-club', userId);

      expect(result.message).toBe('Du hast den Verein verlassen');
    });

    it('should not allow OWNER to leave club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue({
        id: 'membership-1',
        roles: ['OWNER'],
        status: 'ACTIVE',
      });

      await expect(service.leaveClub('test-club', userId)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.clubUser.delete).not.toHaveBeenCalled();
    });

    it('should fail if user is not a member', async () => {
      mockPrisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        slug: 'test-club',
      });
      mockPrisma.clubUser.findFirst.mockResolvedValue(null);

      await expect(service.leaveClub('test-club', userId)).rejects.toThrow(BadRequestException);
    });

    it('should fail for non-existent club', async () => {
      mockPrisma.club.findFirst.mockResolvedValue(null);

      await expect(service.leaveClub('nonexistent', userId)).rejects.toThrow(NotFoundException);
    });
  });
});
