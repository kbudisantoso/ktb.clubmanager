import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubUsersService } from './club-users.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ClubRole } from '../../../../prisma/generated/client/index.js';

const mockPrisma = {
  clubUser: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  member: {
    findMany: vi.fn(),
  },
};

describe('ClubUsersService', () => {
  let service: ClubUsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClubUsersService(mockPrisma as unknown as PrismaService);
  });

  describe('updateClubUserRoles()', () => {
    const clubId = 'club-123';
    const targetClubUserId = 'club-user-456';
    const actorUserId = 'actor-789';

    const mockTargetUser = {
      id: targetClubUserId,
      clubId,
      userId: 'target-user-id',
      roles: [ClubRole.MEMBER],
      user: { id: 'target-user-id', name: 'Target', email: 'target@test.com', image: null },
      joinedAt: new Date(),
    };

    describe('self-edit scenarios', () => {
      it('ADMIN can add MEMBER role to self', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.ADMIN],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);
        mockPrisma.clubUser.update.mockResolvedValue({
          ...selfUser,
          roles: [ClubRole.ADMIN, ClubRole.MEMBER],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.ADMIN],
          { roles: [ClubRole.ADMIN, ClubRole.MEMBER] }
        );

        expect(result.roles).toContain(ClubRole.ADMIN);
        expect(result.roles).toContain(ClubRole.MEMBER);
      });

      it('ADMIN can add TREASURER role to self', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.ADMIN],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);
        mockPrisma.clubUser.update.mockResolvedValue({
          ...selfUser,
          roles: [ClubRole.ADMIN, ClubRole.TREASURER],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.ADMIN],
          { roles: [ClubRole.ADMIN, ClubRole.TREASURER] }
        );

        expect(result.roles).toContain(ClubRole.TREASURER);
      });

      it('ADMIN cannot add OWNER role to self (privilege escalation)', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.ADMIN],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.ADMIN], {
            roles: [ClubRole.ADMIN, ClubRole.OWNER],
          })
        ).rejects.toThrow(ForbiddenException);
      });

      it('OWNER cannot add OWNER role to self', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.MEMBER],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.OWNER], {
            roles: [ClubRole.MEMBER, ClubRole.OWNER],
          })
        ).rejects.toThrow(ForbiddenException);
      });

      it('ADMIN can remove ADMIN role if another role remains', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.ADMIN, ClubRole.MEMBER],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);
        mockPrisma.clubUser.update.mockResolvedValue({
          ...selfUser,
          roles: [ClubRole.MEMBER],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.ADMIN, ClubRole.MEMBER],
          { roles: [ClubRole.MEMBER] }
        );

        expect(result.roles).toEqual([ClubRole.MEMBER]);
      });

      it('ADMIN cannot remove all roles (must use leave club)', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.ADMIN],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.ADMIN], {
            roles: [],
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('OWNER can remove OWNER role if another OWNER exists AND keeps another role', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.OWNER, ClubRole.ADMIN],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);
        mockPrisma.clubUser.count.mockResolvedValue(2); // 2 owners exist
        mockPrisma.clubUser.update.mockResolvedValue({
          ...selfUser,
          roles: [ClubRole.ADMIN],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.OWNER, ClubRole.ADMIN],
          { roles: [ClubRole.ADMIN] }
        );

        expect(result.roles).toEqual([ClubRole.ADMIN]);
      });

      it('OWNER can swap OWNER role for another role if other OWNER exists', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.OWNER],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);
        mockPrisma.clubUser.count.mockResolvedValue(2); // 2 owners exist
        mockPrisma.clubUser.update.mockResolvedValue({
          ...selfUser,
          roles: [ClubRole.MEMBER],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.OWNER],
          { roles: [ClubRole.MEMBER] } // Swap OWNER for MEMBER - allowed
        );

        expect(result.roles).toEqual([ClubRole.MEMBER]);
      });

      it('OWNER cannot remove OWNER role if last owner', async () => {
        const selfUser = {
          ...mockTargetUser,
          userId: actorUserId,
          roles: [ClubRole.OWNER, ClubRole.ADMIN],
        };
        mockPrisma.clubUser.findUnique.mockResolvedValue(selfUser);
        mockPrisma.clubUser.count.mockResolvedValue(1); // Only 1 owner

        await expect(
          service.updateClubUserRoles(
            clubId,
            targetClubUserId,
            actorUserId,
            [ClubRole.OWNER, ClubRole.ADMIN],
            { roles: [ClubRole.ADMIN] }
          )
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('editing others', () => {
      it('ADMIN can assign MEMBER to another user', async () => {
        mockPrisma.clubUser.findUnique.mockResolvedValue(mockTargetUser);
        mockPrisma.clubUser.update.mockResolvedValue({
          ...mockTargetUser,
          roles: [ClubRole.MEMBER],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.ADMIN],
          { roles: [ClubRole.MEMBER] }
        );

        expect(result.roles).toContain(ClubRole.MEMBER);
      });

      it('ADMIN cannot assign OWNER to another user', async () => {
        mockPrisma.clubUser.findUnique.mockResolvedValue(mockTargetUser);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.ADMIN], {
            roles: [ClubRole.OWNER],
          })
        ).rejects.toThrow(ForbiddenException);
      });

      it('OWNER can assign OWNER to another user', async () => {
        mockPrisma.clubUser.findUnique.mockResolvedValue(mockTargetUser);
        mockPrisma.clubUser.update.mockResolvedValue({
          ...mockTargetUser,
          roles: [ClubRole.OWNER],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.OWNER],
          { roles: [ClubRole.OWNER] }
        );

        expect(result.roles).toContain(ClubRole.OWNER);
      });

      it('cannot remove OWNER from last owner', async () => {
        const ownerUser = { ...mockTargetUser, roles: [ClubRole.OWNER] };
        mockPrisma.clubUser.findUnique.mockResolvedValue(ownerUser);
        mockPrisma.clubUser.count.mockResolvedValue(1);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.OWNER], {
            roles: [ClubRole.ADMIN],
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('can remove OWNER if other owners exist', async () => {
        const ownerUser = { ...mockTargetUser, roles: [ClubRole.OWNER] };
        mockPrisma.clubUser.findUnique.mockResolvedValue(ownerUser);
        mockPrisma.clubUser.count.mockResolvedValue(2);
        mockPrisma.clubUser.update.mockResolvedValue({
          ...ownerUser,
          roles: [ClubRole.ADMIN],
        });

        const result = await service.updateClubUserRoles(
          clubId,
          targetClubUserId,
          actorUserId,
          [ClubRole.OWNER],
          { roles: [ClubRole.ADMIN] }
        );

        expect(result.roles).toEqual([ClubRole.ADMIN]);
      });
    });

    describe('error cases', () => {
      it('throws NotFoundException for non-existent user', async () => {
        mockPrisma.clubUser.findUnique.mockResolvedValue(null);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.ADMIN], {
            roles: [ClubRole.MEMBER],
          })
        ).rejects.toThrow(NotFoundException);
      });

      it('throws NotFoundException for user in different club', async () => {
        mockPrisma.clubUser.findUnique.mockResolvedValue({
          ...mockTargetUser,
          clubId: 'different-club',
        });

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.ADMIN], {
            roles: [ClubRole.MEMBER],
          })
        ).rejects.toThrow(NotFoundException);
      });

      it('throws BadRequestException for empty roles array', async () => {
        mockPrisma.clubUser.findUnique.mockResolvedValue(mockTargetUser);

        await expect(
          service.updateClubUserRoles(clubId, targetClubUserId, actorUserId, [ClubRole.ADMIN], {
            roles: [],
          })
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('removeClubUser()', () => {
    const clubId = 'club-123';
    const targetClubUserId = 'club-user-456';
    const actorUserId = 'actor-789';

    it('cannot remove self (use leave club instead)', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue({
        id: targetClubUserId,
        clubId,
        userId: actorUserId,
        roles: [ClubRole.ADMIN],
      });

      await expect(service.removeClubUser(clubId, targetClubUserId, actorUserId)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('cannot remove last owner', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue({
        id: targetClubUserId,
        clubId,
        userId: 'other-user',
        roles: [ClubRole.OWNER],
      });
      mockPrisma.clubUser.count.mockResolvedValue(1);

      await expect(service.removeClubUser(clubId, targetClubUserId, actorUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('can remove owner if other owners exist', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue({
        id: targetClubUserId,
        clubId,
        userId: 'other-user',
        roles: [ClubRole.OWNER],
      });
      mockPrisma.clubUser.count.mockResolvedValue(2);
      mockPrisma.clubUser.delete.mockResolvedValue({});

      await service.removeClubUser(clubId, targetClubUserId, actorUserId);

      expect(mockPrisma.clubUser.delete).toHaveBeenCalledWith({
        where: { id: targetClubUserId },
      });
    });
  });

  describe('getUnlinkedUsers()', () => {
    const clubId = 'club-1';

    function makeClubUser(overrides: Record<string, unknown> = {}) {
      return {
        id: 'cu-1',
        userId: 'user-1',
        clubId,
        status: 'ACTIVE',
        roles: [ClubRole.MEMBER],
        isExternal: false,
        joinedAt: new Date('2025-01-01'),
        user: { id: 'user-1', name: 'Max Muster', email: 'max@test.com', image: null },
        ...overrides,
      };
    }

    it('should return ClubUsers who have NO linked member (happy path)', async () => {
      const cu1 = makeClubUser({ id: 'cu-1', userId: 'user-1' });
      const cu2 = makeClubUser({
        id: 'cu-2',
        userId: 'user-2',
        user: { id: 'user-2', name: 'Erika', email: 'erika@test.com', image: null },
      });
      mockPrisma.clubUser.findMany.mockResolvedValue([cu1, cu2]);
      // user-1 is linked to a member, user-2 is not
      mockPrisma.member.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      const result = await service.getUnlinkedUsers(clubId);

      expect(result).toHaveLength(1);
      expect(result[0]!.userId).toBe('user-2');
      expect(result[0]!.name).toBe('Erika');
    });

    it('should exclude ClubUsers who have a linked member', async () => {
      const cu = makeClubUser();
      mockPrisma.clubUser.findMany.mockResolvedValue([cu]);
      mockPrisma.member.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      const result = await service.getUnlinkedUsers(clubId);

      expect(result).toHaveLength(0);
    });

    it('should include isExternal field in response', async () => {
      const cu = makeClubUser({ isExternal: true });
      mockPrisma.clubUser.findMany.mockResolvedValue([cu]);
      mockPrisma.member.findMany.mockResolvedValue([]);

      const result = await service.getUnlinkedUsers(clubId);

      expect(result[0]!.isExternal).toBe(true);
    });

    it('should return empty array when all users are linked', async () => {
      const cu1 = makeClubUser({ id: 'cu-1', userId: 'user-1' });
      const cu2 = makeClubUser({ id: 'cu-2', userId: 'user-2' });
      mockPrisma.clubUser.findMany.mockResolvedValue([cu1, cu2]);
      mockPrisma.member.findMany.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]);

      const result = await service.getUnlinkedUsers(clubId);

      expect(result).toEqual([]);
    });

    it('should only query ACTIVE ClubUsers', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockPrisma.member.findMany.mockResolvedValue([]);

      await service.getUnlinkedUsers(clubId);

      expect(mockPrisma.clubUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId, status: 'ACTIVE' },
        })
      );
    });

    it('should only consider non-deleted members when filtering linked users', async () => {
      mockPrisma.clubUser.findMany.mockResolvedValue([]);
      mockPrisma.member.findMany.mockResolvedValue([]);

      await service.getUnlinkedUsers(clubId);

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId, userId: { not: null }, deletedAt: null },
        })
      );
    });

    it('should fall back to email when user.name is null', async () => {
      const cu = makeClubUser({
        user: { id: 'user-1', name: null, email: 'fallback@test.com', image: null },
      });
      mockPrisma.clubUser.findMany.mockResolvedValue([cu]);
      mockPrisma.member.findMany.mockResolvedValue([]);

      const result = await service.getUnlinkedUsers(clubId);

      expect(result[0]!.name).toBe('fallback@test.com');
    });
  });

  describe('toggleExternal()', () => {
    const clubId = 'club-1';
    const clubUserId = 'cu-1';

    function makeClubUser(overrides: Record<string, unknown> = {}) {
      return {
        id: clubUserId,
        userId: 'user-1',
        clubId,
        status: 'ACTIVE',
        roles: [ClubRole.MEMBER],
        isExternal: false,
        joinedAt: new Date('2025-01-01'),
        user: { id: 'user-1', name: 'Max', email: 'max@test.com', image: null },
        ...overrides,
      };
    }

    it('should set isExternal to true', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue(makeClubUser());
      mockPrisma.clubUser.update.mockResolvedValue(makeClubUser({ isExternal: true }));

      const result = await service.toggleExternal(clubId, clubUserId, true);

      expect(result.isExternal).toBe(true);
      expect(mockPrisma.clubUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isExternal: true },
        })
      );
    });

    it('should set isExternal to false (unmark)', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue(makeClubUser({ isExternal: true }));
      mockPrisma.clubUser.update.mockResolvedValue(makeClubUser({ isExternal: false }));

      const result = await service.toggleExternal(clubId, clubUserId, false);

      expect(result.isExternal).toBe(false);
    });

    it('should throw NotFoundException if ClubUser not found', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue(null);

      await expect(service.toggleExternal(clubId, clubUserId, true)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if ClubUser belongs to different club', async () => {
      mockPrisma.clubUser.findUnique.mockResolvedValue(makeClubUser({ clubId: 'other-club' }));

      await expect(service.toggleExternal(clubId, clubUserId, true)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
