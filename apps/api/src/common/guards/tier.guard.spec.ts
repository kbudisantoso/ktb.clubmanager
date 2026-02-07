import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { TierGuard } from './tier.guard.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

// Mock Reflector
const mockReflector = {
  getAllAndOverride: vi.fn(),
};

// Mock PrismaService
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  club: {
    findUnique: vi.fn(),
  },
};

// Helper to create mock ExecutionContext
function createMockContext(
  overrides: {
    userId?: string;
    clubContext?: {
      clubId: string;
      clubSlug: string;
      roles: string[];
    };
  } = {}
): ExecutionContext {
  const request = {
    user: overrides.userId ? { id: overrides.userId } : undefined,
    clubContext: overrides.clubContext,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('TierGuard', () => {
  let guard: TierGuard;

  beforeEach(() => {
    vi.resetAllMocks();
    guard = new TierGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService
    );
  });

  describe('no feature required', () => {
    it('should allow when no @RequireFeature decorator', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({ userId: 'user-123' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Super Admin bypass', () => {
    it('should allow Super Admin regardless of tier', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });

      const context = createMockContext({
        userId: 'super-admin-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });

    it('should allow Super Admin even without club context', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: true });

      const context = createMockContext({ userId: 'super-admin-id' });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('feature checks', () => {
    it('should allow when sepa feature is enabled', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: true, reportsEnabled: false, bankImportEnabled: false },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw when sepa feature is disabled', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: false, reportsEnabled: true, bankImportEnabled: true },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'FEATURE_DISABLED',
          details: { feature: 'sepa' },
        }),
      });
    });

    it('should allow when reports feature is enabled', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('reports');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: false, reportsEnabled: true, bankImportEnabled: false },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw when reports feature is disabled', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('reports');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: true, reportsEnabled: false, bankImportEnabled: true },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow when bankImport feature is enabled', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('bankImport');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: false, reportsEnabled: false, bankImportEnabled: true },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw when bankImport feature is disabled', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('bankImport');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: true, reportsEnabled: true, bankImportEnabled: false },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('no tier (default behavior)', () => {
    it('should allow when club has no tier (all features enabled)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: null,
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow when club not found (defensive)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue(null);

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('club context required', () => {
    it('should throw when no club context and feature required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
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

  describe('edge cases', () => {
    it('should handle unknown feature type', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('unknown-feature');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: true, reportsEnabled: true, bankImportEnabled: true },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      // Unknown feature should be denied (defensive)
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should look up club by clubId from context', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('sepa');
      mockPrisma.user.findUnique.mockResolvedValue({ isSuperAdmin: false });
      mockPrisma.club.findUnique.mockResolvedValue({
        tier: { sepaEnabled: true, reportsEnabled: true, bankImportEnabled: true },
      });

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'specific-club-id', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await guard.canActivate(context);

      expect(mockPrisma.club.findUnique).toHaveBeenCalledWith({
        where: { id: 'specific-club-id' },
        include: { tier: true },
      });
    });

    it('should not call club lookup when no feature required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({
        userId: 'user-id',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await guard.canActivate(context);

      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });
  });
});
