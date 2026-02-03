import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClubContextGuard } from './club-context.guard.js';
import type { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ExecutionContext} from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CLUB_CONTEXT_KEY } from '../decorators/club-context.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

// Mock Reflector
const mockReflector = {
  getAllAndOverride: vi.fn(),
};

// Mock PrismaService
const mockPrisma = {
  clubUser: {
    findFirst: vi.fn(),
  },
  club: {
    findFirst: vi.fn(),
  },
};

// Helper to create mock ExecutionContext
function createMockContext(overrides: {
  userId?: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
} = {}): ExecutionContext {
  const request = {
    user: overrides.userId ? { id: overrides.userId } : undefined,
    params: overrides.params || {},
    headers: overrides.headers || {},
    clubContext: undefined as unknown,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('ClubContextGuard', () => {
  let guard: ClubContextGuard;

  beforeEach(() => {
    vi.resetAllMocks();
    guard = new ClubContextGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('sunshine path', () => {
    it('should return true when no @RequireClubContext decorator', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext({ userId: 'user-123' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.clubUser.findFirst).not.toHaveBeenCalled();
    });

    it('should extract clubSlug from route params', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(null); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['MEMBER'],
        club: { id: 'club-1', slug: 'test-club' },
      });

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'test-club' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.clubUser.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            club: { slug: 'test-club', deletedAt: null },
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should extract clubSlug from X-Club-Slug header', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(null); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['ADMIN'],
        club: { id: 'club-1', slug: 'header-club' },
      });

      const context = createMockContext({
        userId: 'user-123',
        headers: { 'x-club-slug': 'header-club' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.clubUser.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            club: { slug: 'header-club', deletedAt: null },
          }),
        }),
      );
    });

    it('should attach clubContext to request', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(null); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['OWNER'],
        club: { id: 'club-1', slug: 'test-club' },
      });

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'test-club' },
      });

      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.clubContext).toEqual({
        clubId: 'club-1',
        clubSlug: 'test-club',
        roles: ['OWNER'],
      });
    });

    it('should validate required roles with @RequireRoles', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(['ADMIN', 'OWNER']); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['ADMIN'],
        club: { id: 'club-1', slug: 'test-club' },
      });

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'test-club' },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should prefer params slug over header', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(null); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['MEMBER'],
        club: { id: 'club-1', slug: 'params-club' },
      });

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'params-club' },
        headers: { 'x-club-slug': 'header-club' },
      });

      await guard.canActivate(context);

      expect(mockPrisma.clubUser.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            club: { slug: 'params-club', deletedAt: null },
          }),
        }),
      );
    });
  });

  describe('error cases', () => {
    it('should throw ForbiddenException when not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext({
        params: { slug: 'test-club' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Authentifizierung erforderlich'),
      );
    });

    it('should throw ForbiddenException when no club slug provided', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext({
        userId: 'user-123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Vereinskontext erforderlich'),
      );
    });

    it('should throw NotFoundException when club does not exist', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(null); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue(null);
      mockPrisma.club.findFirst.mockResolvedValue(null);

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'nonexistent' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new NotFoundException('Verein nicht gefunden'),
      );
    });

    it('should throw ForbiddenException when no membership', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(null); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue(null);
      mockPrisma.club.findFirst.mockResolvedValue({ id: 'club-1' });

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'test-club' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Kein Zugriff auf diesen Verein'),
      );
    });

    it('should throw ForbiddenException when role not sufficient', async () => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(true) // RequireClubContext
        .mockReturnValueOnce(['ADMIN', 'OWNER']); // RequireRoles

      mockPrisma.clubUser.findFirst.mockResolvedValue({
        roles: ['MEMBER'],
        club: { id: 'club-1', slug: 'test-club' },
      });

      const context = createMockContext({
        userId: 'user-123',
        params: { slug: 'test-club' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Erforderliche Rolle: ADMIN oder OWNER'),
      );
    });
  });
});
