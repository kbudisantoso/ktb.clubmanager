import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperAdminGuard } from './super-admin.guard.js';
import type { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

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
function createMockContext(userId?: string): ExecutionContext {
  const request = {
    user: userId ? { id: userId } : undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new SuperAdminGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService
    );
  });

  describe('sunshine path', () => {
    it('should return true when no @SuperAdminOnly decorator', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockContext('user-123');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should allow when isSuperAdmin is true', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        isSuperAdmin: true,
      });

      const context = createMockContext('user-123');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { isSuperAdmin: true },
      });
    });
  });

  describe('error cases', () => {
    it('should throw ForbiddenException when not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentifizierung erforderlich');
    });

    it('should throw ForbiddenException when user not found', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const context = createMockContext('user-123');

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Nur für Plattform-Admins');
    });

    it('should throw ForbiddenException when isSuperAdmin is false', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        isSuperAdmin: false,
      });

      const context = createMockContext('user-123');

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Nur für Plattform-Admins');
    });

    it('should throw ForbiddenException when isSuperAdmin is null', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        isSuperAdmin: null,
      });

      const context = createMockContext('user-123');

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('edge cases', () => {
    it('should query user by id from request.user', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'specific-user-id',
        isSuperAdmin: true,
      });

      const context = createMockContext('specific-user-id');
      await guard.canActivate(context);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'specific-user-id' },
        select: { isSuperAdmin: true },
      });
    });

    it('should only select isSuperAdmin field for efficiency', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        isSuperAdmin: true,
      });

      const context = createMockContext('user-123');
      await guard.canActivate(context);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { isSuperAdmin: true },
        })
      );
    });
  });
});
