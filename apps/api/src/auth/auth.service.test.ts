import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';

// Mock PrismaService
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPrisma as unknown as PrismaService);
  });

  describe('sunshine path', () => {
    describe('findUserById', () => {
      it('returns user when found', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.de',
          name: 'Test User',
        };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await authService.findUserById('user-123');

        expect(result).toEqual(mockUser);
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-123' },
        });
      });
    });

    describe('findUserByEmail', () => {
      it('returns user when found by email', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.de',
          name: 'Test User',
        };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await authService.findUserByEmail('test@example.de');

        expect(result).toEqual(mockUser);
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'test@example.de' },
        });
      });
    });

    describe('validateSession', () => {
      it('returns user for valid non-expired session', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.de',
          name: 'Test User',
        };
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days in future

        mockPrisma.session.findUnique.mockResolvedValue({
          id: 'session-123',
          token: 'valid-token',
          userId: 'user-123',
          expiresAt: futureDate,
          user: mockUser,
        });

        const result = await authService.validateSession('valid-token');

        expect(result).toEqual(mockUser);
        expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
          where: { token: 'valid-token' },
          include: { user: true },
        });
      });
    });

    describe('getUserSessions', () => {
      it('returns all active sessions for user', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const mockSessions = [
          { id: 'session-1', token: 'token-1', expiresAt: futureDate },
          { id: 'session-2', token: 'token-2', expiresAt: futureDate },
        ];
        mockPrisma.session.findMany.mockResolvedValue(mockSessions);

        const result = await authService.getUserSessions('user-123');

        expect(result).toEqual(mockSessions);
        expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            expiresAt: { gt: expect.any(Date) },
          },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('revokeSession', () => {
      it('deletes the session', async () => {
        mockPrisma.session.delete.mockResolvedValue({ id: 'session-123' });

        await authService.revokeSession('session-123');

        expect(mockPrisma.session.delete).toHaveBeenCalledWith({
          where: { id: 'session-123' },
        });
      });
    });

    describe('revokeAllUserSessions', () => {
      it('deletes all sessions for user', async () => {
        mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });

        await authService.revokeAllUserSessions('user-123');

        expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
          where: { userId: 'user-123' },
        });
      });
    });
  });

  describe('edge cases', () => {
    describe('findUserById', () => {
      it('returns null when user not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const result = await authService.findUserById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('findUserByExternalId', () => {
      it('finds user by external ID', async () => {
        const mockUser = {
          id: 'user-123',
          externalId: 'ext-456',
          email: 'test@example.de',
        };
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const result = await authService.findUserByExternalId('ext-456');

        expect(result).toEqual(mockUser);
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { externalId: 'ext-456' },
        });
      });
    });
  });

  describe('error cases', () => {
    describe('validateSession', () => {
      it('returns null for non-existent session', async () => {
        mockPrisma.session.findUnique.mockResolvedValue(null);

        const result = await authService.validateSession('invalid-token');

        expect(result).toBeNull();
      });

      it('returns null for expired session', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // 1 day in past

        mockPrisma.session.findUnique.mockResolvedValue({
          id: 'session-123',
          token: 'expired-token',
          expiresAt: pastDate,
          user: { id: 'user-123' },
        });

        const result = await authService.validateSession('expired-token');

        expect(result).toBeNull();
      });
    });

    describe('getUserSessions', () => {
      it('returns empty array when no active sessions', async () => {
        mockPrisma.session.findMany.mockResolvedValue([]);

        const result = await authService.getUserSessions('user-123');

        expect(result).toEqual([]);
      });
    });
  });
});
