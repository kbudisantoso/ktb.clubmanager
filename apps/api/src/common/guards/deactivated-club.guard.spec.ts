import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeactivatedClubGuard } from './deactivated-club.guard.js';
import type { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

const mockReflector = {
  getAllAndOverride: vi.fn(),
};

const mockPrisma = {
  club: {
    findUnique: vi.fn(),
  },
};

function createMockContext(
  overrides: {
    method?: string;
    clubContext?: { clubId: string; clubSlug: string; roles: string[] } | null;
  } = {}
): ExecutionContext {
  const request = {
    method: overrides.method || 'GET',
    clubContext: overrides.clubContext === null ? undefined : overrides.clubContext,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('DeactivatedClubGuard', () => {
  let guard: DeactivatedClubGuard;

  beforeEach(() => {
    vi.resetAllMocks();
    guard = new DeactivatedClubGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService
    );
  });

  describe('read-only methods pass through', () => {
    it('should allow GET requests', async () => {
      const context = createMockContext({ method: 'GET' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests', async () => {
      const context = createMockContext({ method: 'HEAD' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow OPTIONS requests', async () => {
      const context = createMockContext({ method: 'OPTIONS' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('write operations on deactivated clubs', () => {
    it('should block POST on deactivated club with CLUB_DEACTIVATED code', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.club.findUnique.mockResolvedValue({
        deactivatedAt: new Date(),
      });

      const context = createMockContext({
        method: 'POST',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['OWNER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      try {
        await guard.canActivate(context);
      } catch (error) {
        expect((error as ForbiddenException).getResponse()).toEqual(
          expect.objectContaining({ code: 'CLUB_DEACTIVATED' })
        );
      }
    });

    it('should block PUT on deactivated club', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.club.findUnique.mockResolvedValue({
        deactivatedAt: new Date(),
      });

      const context = createMockContext({
        method: 'PUT',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['ADMIN'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should block PATCH on deactivated club', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.club.findUnique.mockResolvedValue({
        deactivatedAt: new Date(),
      });

      const context = createMockContext({
        method: 'PATCH',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['MEMBER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should block DELETE on deactivated club', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.club.findUnique.mockResolvedValue({
        deactivatedAt: new Date(),
      });

      const context = createMockContext({
        method: 'DELETE',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['OWNER'] },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('non-deactivated clubs', () => {
    it('should allow write operations on active clubs', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockPrisma.club.findUnique.mockResolvedValue({
        deactivatedAt: null,
      });

      const context = createMockContext({
        method: 'POST',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['OWNER'] },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('@DeactivationExempt bypass', () => {
    it('should allow write operations when endpoint is marked @DeactivationExempt', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true); // isExempt = true

      const context = createMockContext({
        method: 'POST',
        clubContext: { clubId: 'club-1', clubSlug: 'test-club', roles: ['OWNER'] },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Should NOT check club deactivation status
      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('no club context', () => {
    it('should pass through when no club context is present (non-club route)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext({
        method: 'POST',
        clubContext: null,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.club.findUnique).not.toHaveBeenCalled();
    });
  });
});
