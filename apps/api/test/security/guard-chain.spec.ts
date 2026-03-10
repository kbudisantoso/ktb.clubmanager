/**
 * Guard Chain Integration Tests
 *
 * Tests the NestJS guard chain (SessionAuth -> SuperAdmin -> ClubContext -> Tier -> Permission -> DeactivatedClub)
 * by creating a minimal test module with manually instantiated guards sharing a mock PrismaService.
 *
 * This verifies guards produce expected HTTP status codes for different access patterns.
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, Post, Put, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import cookieParser from 'cookie-parser';

// Guards (same order as AppModule)
import { SessionAuthGuard } from '../../src/auth/guards/session-auth.guard.js';
import { SuperAdminGuard } from '../../src/common/guards/super-admin.guard.js';
import { ClubContextGuard } from '../../src/common/guards/club-context.guard.js';
import { TierGuard } from '../../src/common/guards/tier.guard.js';
import { PermissionGuard } from '../../src/common/guards/permission.guard.js';
import { DeactivatedClubGuard } from '../../src/common/guards/deactivated-club.guard.js';

// Decorators
import { Public } from '../../src/auth/decorators/public.decorator.js';
import { SuperAdminOnly } from '../../src/common/decorators/super-admin.decorator.js';
import { RequireClubContext } from '../../src/common/decorators/club-context.decorator.js';
import { RequirePermission } from '../../src/common/decorators/permissions.decorator.js';
import { Permission } from '../../src/common/permissions/permissions.enum.js';
import { DeactivationExempt } from '../../src/common/decorators/deactivation-exempt.decorator.js';

// PrismaService type
import { PrismaService } from '../../src/prisma/prisma.service.js';

// ---------------------------------------------------------------------------
// Mock PrismaService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = 'valid-session-token';
const REGULAR_USER_ID = 'user-regular';
const SUPER_ADMIN_ID = 'user-super-admin';
const CLUB_SLUG = 'test-club';
const CLUB_ID = 'club-uuid-1';

type MockPrisma = ReturnType<typeof createMockPrisma>;

function withSession(agent: request.Test, token = VALID_TOKEN): request.Test {
  return agent.set('Cookie', `better-auth.session_token=${token}`);
}

function setupRegularSession(mock: MockPrisma) {
  mock.session.findUnique.mockImplementation(({ where }: { where: { token: string } }) => {
    if (where.token === VALID_TOKEN) {
      return Promise.resolve({
        id: 'session-1',
        token: VALID_TOKEN,
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: REGULAR_USER_ID, email: 'regular@test.de', name: 'Regular', image: null },
      });
    }
    return Promise.resolve(null);
  });
  mock.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    if (where.id === REGULAR_USER_ID) {
      return Promise.resolve({ id: REGULAR_USER_ID, isSuperAdmin: false });
    }
    return Promise.resolve(null);
  });
}

function setupSuperAdminSession(mock: MockPrisma) {
  mock.session.findUnique.mockImplementation(({ where }: { where: { token: string } }) => {
    if (where.token === VALID_TOKEN) {
      return Promise.resolve({
        id: 'session-sa',
        token: VALID_TOKEN,
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: SUPER_ADMIN_ID, email: 'admin@test.de', name: 'Admin', image: null },
      });
    }
    return Promise.resolve(null);
  });
  mock.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    if (where.id === SUPER_ADMIN_ID) {
      return Promise.resolve({ id: SUPER_ADMIN_ID, isSuperAdmin: true });
    }
    return Promise.resolve(null);
  });
}

function setupClubMembership(mock: MockPrisma, roles: string[] = ['MEMBER']) {
  mock.clubUser.findFirst.mockResolvedValue({
    roles,
    club: { id: CLUB_ID, slug: CLUB_SLUG },
    status: 'ACTIVE',
  });
}

// ---------------------------------------------------------------------------
// Test controllers that mirror real app route patterns
// ---------------------------------------------------------------------------

@Controller('public')
class TestPublicController {
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

@Controller('clubs')
class TestClubsController {
  @Get()
  @SuperAdminOnly()
  listAll() {
    return [];
  }

  @Post()
  create() {
    return { id: 'new-club' };
  }
}

@Controller('clubs/:slug/members')
@RequireClubContext()
class TestMembersController {
  @Get()
  @RequirePermission(Permission.MEMBER_READ)
  list() {
    return [];
  }

  @Post()
  @RequirePermission(Permission.MEMBER_CREATE)
  create() {
    return { id: 'new-member' };
  }
}

@Controller('admin/clubs')
@SuperAdminOnly()
class TestAdminClubsController {
  @Get()
  listAll() {
    return [];
  }
}

@Controller('admin/settings')
@SuperAdminOnly()
class TestAdminSettingsController {
  @Get()
  getSettings() {
    return {};
  }
}

@Controller('clubs/:slug/deactivation-test')
@RequireClubContext()
class TestDeactivationController {
  @Put()
  writeOp() {
    return { written: true };
  }

  @Get()
  readOp() {
    return { read: true };
  }

  @Post('exempt')
  @DeactivationExempt()
  exemptOp() {
    return { exempt: true };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Guard Chain Integration Tests', () => {
  let app: INestApplication;
  let mockPrisma: MockPrisma;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    const prismaValue = mockPrisma as unknown as PrismaService;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        TestPublicController,
        TestClubsController,
        TestMembersController,
        TestAdminClubsController,
        TestAdminSettingsController,
        TestDeactivationController,
      ],
      providers: [{ provide: PrismaService, useValue: prismaValue }],
    }).compile();

    const reflector = moduleFixture.get(Reflector);

    // Manually instantiate guards with shared dependencies
    const sessionGuard = new SessionAuthGuard(reflector, prismaValue);
    const superAdminGuard = new SuperAdminGuard(reflector, prismaValue);
    const clubContextGuard = new ClubContextGuard(reflector, prismaValue);
    const tierGuard = new TierGuard(reflector, prismaValue);
    const permissionGuard = new PermissionGuard(reflector, prismaValue);
    const deactivatedClubGuard = new DeactivatedClubGuard(reflector, prismaValue);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');

    // Apply guards globally in the correct order
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
  // 1. Public routes bypass auth
  // -----------------------------------------------------------------------
  describe('@Public() routes bypass authentication', () => {
    it('GET /api/public/health without session returns 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/public/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  // -----------------------------------------------------------------------
  // 2. Unauthenticated access -> 401
  // -----------------------------------------------------------------------
  describe('unauthenticated access returns 401', () => {
    it('GET /api/clubs without auth cookie returns 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/clubs');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/clubs without auth cookie returns 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/admin/clubs');
      expect(res.status).toBe(401);
    });

    it('POST /api/clubs without auth cookie returns 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/clubs').send({ name: 'x' });
      expect(res.status).toBe(401);
    });

    it('GET /api/clubs/:slug/members without auth cookie returns 401', async () => {
      const res = await request(app.getHttpServer()).get(`/api/clubs/${CLUB_SLUG}/members`);
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Non-super-admin on admin routes -> 403
  // -----------------------------------------------------------------------
  describe('non-super-admin on admin routes returns 403', () => {
    it('GET /api/admin/clubs with regular user returns 403', async () => {
      setupRegularSession(mockPrisma);
      const res = await withSession(request(app.getHttpServer()).get('/api/admin/clubs'));
      expect(res.status).toBe(403);
    });

    it('GET /api/admin/settings with regular user returns 403', async () => {
      setupRegularSession(mockPrisma);
      const res = await withSession(request(app.getHttpServer()).get('/api/admin/settings'));
      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Non-member on club routes -> 404 (SEC-012: no info leakage)
  // -----------------------------------------------------------------------
  describe('non-member accessing club routes returns 404 (SEC-012)', () => {
    it('GET /api/clubs/:slug/members without membership returns 404', async () => {
      setupRegularSession(mockPrisma);
      mockPrisma.clubUser.findFirst.mockResolvedValue(null);
      const res = await withSession(
        request(app.getHttpServer()).get(`/api/clubs/${CLUB_SLUG}/members`)
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // 5. Super admin on admin routes -> 200
  // -----------------------------------------------------------------------
  describe('super admin on admin routes returns 200', () => {
    it('GET /api/admin/clubs with super admin returns 200', async () => {
      setupSuperAdminSession(mockPrisma);
      const res = await withSession(request(app.getHttpServer()).get('/api/admin/clubs'));
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Correct role on club routes -> 200
  // -----------------------------------------------------------------------
  describe('correct role on protected routes returns 200', () => {
    it('GET /api/clubs/:slug/members with SECRETARY role returns 200', async () => {
      setupRegularSession(mockPrisma);
      setupClubMembership(mockPrisma, ['SECRETARY']);
      // TierGuard + DeactivatedClubGuard club lookups
      mockPrisma.club.findUnique.mockResolvedValue({
        id: CLUB_ID,
        tier: null,
        deactivatedAt: null,
      });

      const res = await withSession(
        request(app.getHttpServer()).get(`/api/clubs/${CLUB_SLUG}/members`)
      );
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Expired session -> 401
  // -----------------------------------------------------------------------
  describe('expired session returns 401', () => {
    it('GET /api/clubs with expired session returns 401', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-expired',
        token: VALID_TOKEN,
        expiresAt: new Date(Date.now() - 3600000),
        user: { id: REGULAR_USER_ID, email: 'r@test.de', name: 'R', image: null },
      });
      const res = await withSession(request(app.getHttpServer()).get('/api/clubs'));
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // 8. Invalid session token -> 401
  // -----------------------------------------------------------------------
  describe('invalid session token returns 401', () => {
    it('GET /api/clubs with unknown token returns 401', async () => {
      const res = await withSession(
        request(app.getHttpServer()).get('/api/clubs'),
        'nonexistent-token'
      );
      expect(res.status).toBe(401);
    });
  });
});
