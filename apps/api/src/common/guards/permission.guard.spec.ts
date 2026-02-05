import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { Permission } from '../permissions/permissions.enum.js';

// Mock Reflector
const mockReflector = {
  getAllAndOverride: vi.fn(),
};

// Mock PrismaService
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
};

// Helper to create mock ExecutionContext
function createMockContext(overrides: {
  userId?: string;
  clubContext?: {
    clubId: string;
    clubSlug: string;
    roles: string[];
  };
  userPermissions?: string[];
} = {}): ExecutionContext {
  const request = {
    user: overrides.userId ? { id: overrides.userId } : undefined,
    clubContext: overrides.clubContext,
    userPermissions: overrides.userPermissions,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;

  beforeEach(() => {
    vi.resetAllMocks();
    guard = new PermissionGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('no permissions required', () => {
    it('should allow when no @RequirePermission decorator', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({ userId: 'user-123' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should allow when empty permissions array', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockContext({ userId: 'user-123' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Super Admin bypass', () => {
    it('should allow Super Admin regardless of permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.MEMBER_CREATE]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });

      const context = createMockContext({ userId: 'super-admin-id' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'super-admin-id' },
        select: { isSuperAdmin: true },
      });
    });

    it('should allow Super Admin even without club context', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.FINANCE_CREATE]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });

      const context = createMockContext({ userId: 'super-admin-id' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('permission checks', () => {
    it('should throw ForbiddenException when user lacks required permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.MEMBER_CREATE]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'PERMISSION_DENIED',
        }),
      });
    });

    it('should allow when user has required permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.MEMBER_CREATE]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['TREASURER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should use OR logic when multiple permissions required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        Permission.MEMBER_CREATE,
        Permission.FINANCE_CREATE,
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      // SECRETARY has MEMBER_CREATE but not FINANCE_CREATE
      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['SECRETARY'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should deny when user has none of the required permissions', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        Permission.CLUB_DELETE,
        Permission.CLUB_TRANSFER,
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      // TREASURER has neither CLUB_DELETE nor CLUB_TRANSFER
      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['TREASURER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('club context required', () => {
    it('should throw when no club context and permissions required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.MEMBER_READ]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      const context = createMockContext({
        userId: 'user-id',
        // No clubContext
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'CLUB_ACCESS_DENIED',
        }),
      });
    });
  });

  describe('permission derivation from roles', () => {
    it('should derive permissions from OWNER role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.CLUB_DELETE]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['OWNER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should combine permissions from multiple roles', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.FINANCE_CREATE]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      // ADMIN + TREASURER - ADMIN doesn't have FINANCE_CREATE, but TREASURER does
      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['ADMIN', 'TREASURER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should memoize permissions on request', async () => {
      // MEMBER only has PROFILE_READ, PROFILE_UPDATE, DASHBOARD_READ
      mockReflector.getAllAndOverride.mockReturnValue([Permission.DASHBOARD_READ]);
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });

      const request = {
        user: { id: 'user-id' },
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
        userPermissions: undefined as string[] | undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => vi.fn(),
        getClass: () => vi.fn(),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      // Permissions should be memoized on request
      expect(request.userPermissions).toBeDefined();
      expect(Array.isArray(request.userPermissions)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null user', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([Permission.MEMBER_READ]);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const context = createMockContext({
        userId: undefined,
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      // Should throw because Super Admin check fails (no user)
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should not call findUnique when no permissions required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({ userId: 'user-123' });
      await guard.canActivate(context);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
