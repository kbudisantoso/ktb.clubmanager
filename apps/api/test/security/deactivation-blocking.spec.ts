/**
 * Deactivation Blocking Integration Tests
 *
 * Verifies that write operations on deactivated clubs are blocked by
 * the DeactivatedClubGuard. Read operations and @DeactivationExempt()
 * endpoints remain accessible.
 *
 * Tests the guard chain from Plan 11.8-03 (ClubsService deactivation checks)
 * and the DeactivatedClubGuard behavior.
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, Post, Put, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import cookieParser from 'cookie-parser';

// Guards
import { SessionAuthGuard } from '../../src/auth/guards/session-auth.guard.js';
import { SuperAdminGuard } from '../../src/common/guards/super-admin.guard.js';
import { ClubContextGuard } from '../../src/common/guards/club-context.guard.js';
import { TierGuard } from '../../src/common/guards/tier.guard.js';
import { PermissionGuard } from '../../src/common/guards/permission.guard.js';
import { DeactivatedClubGuard } from '../../src/common/guards/deactivated-club.guard.js';

// Decorators
import { RequireClubContext } from '../../src/common/decorators/club-context.decorator.js';
import { DeactivationExempt } from '../../src/common/decorators/deactivation-exempt.decorator.js';

// PrismaService
import { PrismaService } from '../../src/prisma/prisma.service.js';

// ---------------------------------------------------------------------------
// Test controllers
// ---------------------------------------------------------------------------

@Controller('clubs/:slug/data')
@RequireClubContext()
class TestClubDataController {
  @Get()
  read() {
    return { data: 'club-data' };
  }

  @Put()
  update() {
    return { updated: true };
  }

  @Post()
  create() {
    return { created: true };
  }

  @Post('reactivate')
  @DeactivationExempt()
  reactivate() {
    return { reactivated: true };
  }
}

// ---------------------------------------------------------------------------
// Mock & helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = 'valid-session-token';
const USER_ID = 'user-deact';
const CLUB_SLUG = 'deactivated-club';
const CLUB_ID = 'club-deact-uuid';

function createMockPrisma() {
  return {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $extends: vi.fn().mockReturnThis(),
    session: { findUnique: vi.fn().mockResolvedValue(null) },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    club: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    clubUser: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    forClub: vi.fn().mockReturnThis(),
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

function withSession(agent: request.Test): request.Test {
  return agent.set('Cookie', `better-auth.session_token=${VALID_TOKEN}`);
}

function setupDeactivatedClubSession(mock: MockPrisma) {
  mock.session.findUnique.mockImplementation(({ where }: { where: { token: string } }) => {
    if (where.token === VALID_TOKEN) {
      return Promise.resolve({
        id: 'session-deact',
        token: VALID_TOKEN,
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: USER_ID, email: 'user@test.de', name: 'User', image: null },
      });
    }
    return Promise.resolve(null);
  });

  mock.user.findUnique.mockResolvedValue({ id: USER_ID, isSuperAdmin: false });

  // User has OWNER membership in the deactivated club
  mock.clubUser.findFirst.mockResolvedValue({
    roles: ['OWNER'],
    club: { id: CLUB_ID, slug: CLUB_SLUG },
    status: 'ACTIVE',
  });

  // Club is deactivated
  mock.club.findUnique.mockResolvedValue({
    id: CLUB_ID,
    tier: null,
    deactivatedAt: new Date('2026-01-15'),
  });
}

function setupActiveClubSession(mock: MockPrisma) {
  mock.session.findUnique.mockImplementation(({ where }: { where: { token: string } }) => {
    if (where.token === VALID_TOKEN) {
      return Promise.resolve({
        id: 'session-active',
        token: VALID_TOKEN,
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: USER_ID, email: 'user@test.de', name: 'User', image: null },
      });
    }
    return Promise.resolve(null);
  });

  mock.user.findUnique.mockResolvedValue({ id: USER_ID, isSuperAdmin: false });

  mock.clubUser.findFirst.mockResolvedValue({
    roles: ['OWNER'],
    club: { id: CLUB_ID, slug: CLUB_SLUG },
    status: 'ACTIVE',
  });

  // Club is active
  mock.club.findUnique.mockResolvedValue({
    id: CLUB_ID,
    tier: null,
    deactivatedAt: null,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Deactivation Blocking Integration Tests', () => {
  let app: INestApplication;
  let mockPrisma: MockPrisma;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    const prismaValue = mockPrisma as unknown as PrismaService;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestClubDataController],
      providers: [{ provide: PrismaService, useValue: prismaValue }],
    }).compile();

    const reflector = moduleFixture.get(Reflector);

    const sessionGuard = new SessionAuthGuard(reflector, prismaValue);
    const superAdminGuard = new SuperAdminGuard(reflector, prismaValue);
    const clubContextGuard = new ClubContextGuard(reflector, prismaValue);
    const tierGuard = new TierGuard(reflector, prismaValue);
    const permissionGuard = new PermissionGuard(reflector, prismaValue);
    const deactivatedClubGuard = new DeactivatedClubGuard(reflector, prismaValue);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalGuards(
      sessionGuard,
      superAdminGuard,
      clubContextGuard,
      tierGuard,
      permissionGuard,
      deactivatedClubGuard
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.session.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.clubUser.findFirst.mockResolvedValue(null);
    mockPrisma.club.findFirst.mockResolvedValue(null);
    mockPrisma.club.findUnique.mockResolvedValue(null);
  });

  // -----------------------------------------------------------------------
  // Write operations on deactivated clubs are blocked
  // -----------------------------------------------------------------------
  describe('write operations on deactivated clubs are blocked', () => {
    it('PUT on deactivated club returns 403 with CLUB_DEACTIVATED code', async () => {
      setupDeactivatedClubSession(mockPrisma);
      const res = await withSession(
        request(app.getHttpServer()).put(`/api/clubs/${CLUB_SLUG}/data`)
      );
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CLUB_DEACTIVATED');
    });

    it('POST on deactivated club returns 403', async () => {
      setupDeactivatedClubSession(mockPrisma);
      const res = await withSession(
        request(app.getHttpServer()).post(`/api/clubs/${CLUB_SLUG}/data`).send({ test: true })
      );
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CLUB_DEACTIVATED');
    });
  });

  // -----------------------------------------------------------------------
  // Read operations on deactivated clubs still work
  // -----------------------------------------------------------------------
  describe('read operations on deactivated clubs are allowed', () => {
    it('GET on deactivated club returns 200', async () => {
      setupDeactivatedClubSession(mockPrisma);
      const res = await withSession(
        request(app.getHttpServer()).get(`/api/clubs/${CLUB_SLUG}/data`)
      );
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // @DeactivationExempt() endpoints work on deactivated clubs
  // -----------------------------------------------------------------------
  describe('@DeactivationExempt() bypasses blocking', () => {
    it('POST to exempt endpoint on deactivated club is not blocked', async () => {
      setupDeactivatedClubSession(mockPrisma);
      const res = await withSession(
        request(app.getHttpServer()).post(`/api/clubs/${CLUB_SLUG}/data/reactivate`)
      );
      // NestJS defaults POST to 201, key assertion is that it's NOT 403
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ reactivated: true });
    });
  });

  // -----------------------------------------------------------------------
  // Active clubs are not affected
  // -----------------------------------------------------------------------
  describe('active clubs are not affected', () => {
    it('PUT on active club returns 200', async () => {
      setupActiveClubSession(mockPrisma);
      const res = await withSession(
        request(app.getHttpServer()).put(`/api/clubs/${CLUB_SLUG}/data`)
      );
      expect(res.status).toBe(200);
    });

    it('POST on active club returns 201', async () => {
      setupActiveClubSession(mockPrisma);
      const res = await withSession(
        request(app.getHttpServer()).post(`/api/clubs/${CLUB_SLUG}/data`).send({ test: true })
      );
      // NestJS defaults POST to 201
      expect(res.status).toBe(201);
    });
  });
});
