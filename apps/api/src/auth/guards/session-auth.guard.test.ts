import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { SessionAuthGuard, type SessionUser } from './session-auth.guard';
import type { PrismaService } from '../../prisma/prisma.service';

// Mock PrismaService
const mockPrisma = {
  session: {
    findUnique: vi.fn(),
  },
};

// Mock Reflector
const mockReflector = {
  getAllAndOverride: vi.fn(),
};

// Helper to create mock execution context
function createMockContext(request: Record<string, unknown>): ExecutionContext {
  // Ensure headers and cookies exist
  if (!request.headers) request.headers = {};
  if (!request.cookies) request.cookies = {};

  return {
    switchToHttp: () => ({
      getRequest: () => request, // Return the same object so mutations are visible
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext;
}

describe('SessionAuthGuard', () => {
  let guard: SessionAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReflector.getAllAndOverride.mockReturnValue(false); // Not public by default
    guard = new SessionAuthGuard(
      mockReflector as unknown as Reflector,
      mockPrisma as unknown as PrismaService
    );
  });

  describe('sunshine path', () => {
    it('allows access with valid Bearer token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.de',
        name: 'Test User',
        image: null,
      };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        token: 'valid-token',
        expiresAt: futureDate,
        user: mockUser,
      });

      const requestObj: Record<string, unknown> = {
        headers: { authorization: 'Bearer valid-token' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(requestObj['user']).toEqual({
        id: 'user-123',
        email: 'test@example.de',
        name: 'Test User',
        image: null,
        sessionId: 'session-123',
      });
    });

    it('allows access with valid session cookie', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.de',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        token: 'cookie-token',
        expiresAt: futureDate,
        user: mockUser,
      });

      const requestObj: Record<string, unknown> = {
        headers: {},
        cookies: { 'better-auth.session_token': 'cookie-token' },
      };
      const context = createMockContext(requestObj);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((requestObj['user'] as SessionUser).image).toBe('https://example.com/avatar.jpg');
      expect((requestObj['user'] as SessionUser).sessionId).toBe('session-123');
    });

    it('allows access to public routes without token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true); // Mark as public

      const requestObj = { headers: {}, cookies: {} };
      const context = createMockContext(requestObj);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrisma.session.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('prefers Bearer token over cookie when both present', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.de',
        name: 'Test User',
        image: null,
      };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        token: 'bearer-token',
        expiresAt: futureDate,
        user: mockUser,
      });

      const requestObj = {
        headers: { authorization: 'Bearer bearer-token' },
        cookies: { 'better-auth.session_token': 'cookie-token' },
      };
      const context = createMockContext(requestObj);

      await guard.canActivate(context);

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { token: 'bearer-token' },
        include: { user: true },
      });
    });

    it('handles user with null name and image', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.de',
        name: null,
        image: null,
      };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        token: 'valid-token',
        expiresAt: futureDate,
        user: mockUser,
      });

      const requestObj: Record<string, unknown> = {
        headers: { authorization: 'Bearer valid-token' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect((requestObj['user'] as SessionUser).name).toBeNull();
      expect((requestObj['user'] as SessionUser).image).toBeNull();
      expect((requestObj['user'] as SessionUser).sessionId).toBe('session-123');
    });
  });

  describe('error cases', () => {
    it('throws UnauthorizedException when no token provided', async () => {
      const requestObj = { headers: {}, cookies: {} };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException with correct message for no token', async () => {
      const requestObj = { headers: {}, cookies: {} };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow('No session token provided');
    });

    it('throws UnauthorizedException for invalid token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const requestObj = {
        headers: { authorization: 'Bearer invalid-token' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException with correct message for invalid token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const requestObj = {
        headers: { authorization: 'Bearer invalid-token' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid session token');
    });

    it('throws UnauthorizedException for expired session', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day in past

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        token: 'expired-token',
        expiresAt: pastDate,
        user: { id: 'user-123', email: 'test@example.de' },
      });

      const requestObj = {
        headers: { authorization: 'Bearer expired-token' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow('Session expired');
    });

    it('ignores malformed Authorization header', async () => {
      const requestObj = {
        headers: { authorization: 'Basic invalid-format' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow('No session token provided');
    });

    it('ignores Authorization header without Bearer prefix', async () => {
      const requestObj = {
        headers: { authorization: 'valid-token-without-bearer' },
        cookies: {},
      };
      const context = createMockContext(requestObj);

      await expect(guard.canActivate(context)).rejects.toThrow('No session token provided');
    });
  });
});
