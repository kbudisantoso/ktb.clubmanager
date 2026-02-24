import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import yaml from 'js-yaml';
import { createPrismaClient, disconnect } from '../lib/prisma.js';
import { resolvePassword } from '../lib/password.js';
import type { ClubExportData } from '../lib/types.js';

// We test the scripts by importing their core logic indirectly:
// import-club.ts and export-club.ts are CLI entry points,
// so we replicate the key flows using the same libraries.

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function loadFixture(name: string): ClubExportData {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
  return yaml.load(raw) as ClubExportData;
}

const prisma = createPrismaClient();

// Track created entities for cleanup
const createdClubSlugs: string[] = [];
const createdUserEmails: string[] = [];

async function cleanup() {
  // Delete in reverse dependency order
  for (const slug of createdClubSlugs) {
    const club = await prisma.club.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!club) continue;

    // Delete all club-scoped data
    await prisma.membershipPeriod.deleteMany({
      where: { member: { clubId: club.id } },
    });
    await prisma.memberStatusTransition.deleteMany({
      where: { clubId: club.id },
    });
    await prisma.member.deleteMany({ where: { clubId: club.id } });
    await prisma.household.deleteMany({ where: { clubId: club.id } });
    await prisma.membershipType.deleteMany({
      where: { clubId: club.id },
    });
    await prisma.numberRange.deleteMany({ where: { clubId: club.id } });
    await prisma.clubUser.deleteMany({ where: { clubId: club.id } });
    await prisma.club.delete({ where: { id: club.id } });
  }
  createdClubSlugs.length = 0;

  for (const email of createdUserEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) continue;
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  createdUserEmails.length = 0;
}

// Ensure tiers exist (same as seed.ts)
async function ensureTiers() {
  await prisma.tier.upsert({
    where: { name: 'all' },
    update: {},
    create: {
      name: 'all',
      description: 'Volle Funktionalität ohne Einschränkungen',
      isVisible: true,
      isSeeded: true,
      sortOrder: 0,
      color: 'green',
      icon: 'crown',
      sepaEnabled: true,
      reportsEnabled: true,
      bankImportEnabled: true,
    },
  });
}

beforeAll(async () => {
  await ensureTiers();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await disconnect();
});

// ---------------------------------------------------------------------------
// Helper: Run import from data (replicates import-club.ts logic)
// ---------------------------------------------------------------------------

async function runImport(data: ClubExportData) {
  // Resolve passwords
  const passwordMap = new Map<string, string>();
  for (const user of data.users ?? []) {
    const resolved = await resolvePassword(user.password, user.passwordHash);
    if (resolved) {
      passwordMap.set(user.email, resolved);
    }
  }

  // Track for cleanup
  createdClubSlugs.push(data.club.slug);
  for (const user of data.users ?? []) {
    createdUserEmails.push(user.email);
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const counts = {
        usersCreated: 0,
        usersReused: 0,
        clubUsersCreated: 0,
        membershipTypesCreated: 0,
        numberRangesCreated: 0,
        membersCreated: 0,
        membershipPeriodsCreated: 0,
        householdsCreated: 0,
      };

      const userIdByEmail = new Map<string, string>();
      const membershipTypeIdByCode = new Map<string, string>();
      const memberIdByNumber = new Map<string, string>();
      const householdIdByName = new Map<string, string>();

      // Users
      for (const userData of data.users ?? []) {
        const existing = await tx.user.findUnique({
          where: { email: userData.email },
          select: { id: true },
        });

        let userId: string;
        if (existing) {
          userId = existing.id;
          counts.usersReused++;
        } else {
          const newUser = await tx.user.create({
            data: {
              email: userData.email,
              emailVerified: true,
              name: userData.name,
              isSuperAdmin: userData.isSuperAdmin ?? false,
              locale: userData.locale ?? 'de',
            },
          });
          userId = newUser.id;
          counts.usersCreated++;

          const hash = passwordMap.get(userData.email);
          if (hash) {
            await tx.account.create({
              data: {
                userId,
                providerId: 'credential',
                accountId: userId,
                password: hash,
              },
            });
          }
        }
        userIdByEmail.set(userData.email, userId);
      }

      // Club
      const defaultTier = await tx.tier.findFirst({
        where: { name: 'all' },
        select: { id: true },
      });

      const clubData = data.club;
      const club = await tx.club.create({
        data: {
          name: clubData.name,
          slug: clubData.slug,
          legalName: clubData.legalName,
          shortCode: clubData.shortCode,
          description: clubData.description,
          visibility: clubData.visibility ?? 'PRIVATE',
          avatarColor: clubData.avatarColor ?? 'blue',
          foundedAt: clubData.foundedAt ? new Date(clubData.foundedAt) : undefined,
          street: clubData.street,
          houseNumber: clubData.houseNumber,
          postalCode: clubData.postalCode,
          city: clubData.city,
          phone: clubData.phone,
          email: clubData.email,
          website: clubData.website,
          isRegistered: clubData.isRegistered ?? false,
          registryCourt: clubData.registryCourt,
          registryNumber: clubData.registryNumber,
          clubPurpose: clubData.clubPurpose,
          clubSpecialForm: clubData.clubSpecialForm,
          taxNumber: clubData.taxNumber,
          vatId: clubData.vatId,
          taxOffice: clubData.taxOffice,
          isNonProfit: clubData.isNonProfit ?? false,
          iban: clubData.iban,
          bic: clubData.bic,
          bankName: clubData.bankName,
          accountHolder: clubData.accountHolder,
          fiscalYearStartMonth: clubData.fiscalYearStartMonth,
          probationPeriodDays: clubData.probationPeriodDays,
          tierId: defaultTier?.id,
        },
      });

      // ClubUsers
      for (const userData of data.users ?? []) {
        const userId = userIdByEmail.get(userData.email);
        if (!userId) continue;
        await tx.clubUser.create({
          data: {
            userId,
            clubId: club.id,
            roles: userData.clubRoles,
            status: userData.clubStatus ?? 'ACTIVE',
            isExternal: userData.isExternal ?? false,
          },
        });
        counts.clubUsersCreated++;
      }

      // MembershipTypes
      for (const mtData of data.membershipTypes ?? []) {
        const mt = await tx.membershipType.create({
          data: {
            clubId: club.id,
            name: mtData.name,
            code: mtData.code,
            description: mtData.description,
            isDefault: mtData.isDefault ?? false,
            sortOrder: mtData.sortOrder ?? 0,
            isActive: mtData.isActive ?? true,
            vote: mtData.vote ?? true,
            assemblyAttendance: mtData.assemblyAttendance ?? true,
            eligibleForOffice: mtData.eligibleForOffice ?? true,
            color: mtData.color ?? 'BLUE',
          },
        });
        membershipTypeIdByCode.set(mtData.code, mt.id);
        counts.membershipTypesCreated++;
      }

      // Set default membership type
      const defaultType = (data.membershipTypes ?? []).find((mt) => mt.isDefault);
      if (defaultType) {
        const defaultTypeId = membershipTypeIdByCode.get(defaultType.code);
        if (defaultTypeId) {
          await tx.club.update({
            where: { id: club.id },
            data: { defaultMembershipTypeId: defaultTypeId },
          });
        }
      }

      // NumberRanges
      for (const nrData of data.numberRanges ?? []) {
        await tx.numberRange.create({
          data: {
            clubId: club.id,
            entityType: nrData.entityType,
            prefix: nrData.prefix ?? '',
            currentValue: nrData.currentValue ?? 0,
            padLength: nrData.padLength ?? 4,
            yearReset: nrData.yearReset ?? false,
          },
        });
        counts.numberRangesCreated++;
      }

      // Members
      for (const memberData of data.members ?? []) {
        const userId = memberData.userEmail ? userIdByEmail.get(memberData.userEmail) : undefined;

        const member = await tx.member.create({
          data: {
            clubId: club.id,
            memberNumber: memberData.memberNumber,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            personType: memberData.personType ?? 'NATURAL',
            salutation: memberData.salutation,
            title: memberData.title,
            nickname: memberData.nickname,
            organizationName: memberData.organizationName,
            contactFirstName: memberData.contactFirstName,
            contactLastName: memberData.contactLastName,
            department: memberData.department,
            position: memberData.position,
            vatId: memberData.vatId,
            street: memberData.street,
            houseNumber: memberData.houseNumber,
            addressExtra: memberData.addressExtra,
            postalCode: memberData.postalCode,
            city: memberData.city,
            country: memberData.country ?? 'DE',
            email: memberData.email,
            phone: memberData.phone,
            mobile: memberData.mobile,
            notes: memberData.notes,
            status: memberData.status ?? 'PENDING',
            statusChangedAt: new Date(),
            userId,
          },
        });
        memberIdByNumber.set(memberData.memberNumber, member.id);
        counts.membersCreated++;
      }

      // MembershipPeriods
      for (const memberData of data.members ?? []) {
        if (!memberData.joinDate) continue;
        const memberId = memberIdByNumber.get(memberData.memberNumber);
        if (!memberId) continue;
        const membershipTypeId = memberData.membershipTypeCode
          ? membershipTypeIdByCode.get(memberData.membershipTypeCode)
          : undefined;
        await tx.membershipPeriod.create({
          data: {
            memberId,
            joinDate: new Date(memberData.joinDate),
            membershipTypeId: membershipTypeId ?? null,
          },
        });
        counts.membershipPeriodsCreated++;
      }

      // Households
      for (const hhData of data.households ?? []) {
        const household = await tx.household.create({
          data: { clubId: club.id, name: hhData.name },
        });
        householdIdByName.set(hhData.name, household.id);
        counts.householdsCreated++;
      }

      // Update members with household
      for (const memberData of data.members ?? []) {
        if (!memberData.householdName) continue;
        const memberId = memberIdByNumber.get(memberData.memberNumber);
        const householdId = householdIdByName.get(memberData.householdName);
        if (!memberId || !householdId) continue;
        await tx.member.update({
          where: { id: memberId },
          data: {
            householdId,
            householdRole: memberData.householdRole ?? 'OTHER',
          },
        });
      }

      // Set primaryContactId
      for (const hhData of data.households ?? []) {
        if (!hhData.primaryContactMemberNumber) continue;
        const householdId = householdIdByName.get(hhData.name);
        const memberId = memberIdByNumber.get(hhData.primaryContactMemberNumber);
        if (!householdId || !memberId) continue;
        await tx.household.update({
          where: { id: householdId },
          data: { primaryContactId: memberId },
        });
      }

      return counts;
    },
    { timeout: 30_000 }
  );

  return result;
}

// ---------------------------------------------------------------------------
// Helper: Run export (replicates export-club.ts logic)
// ---------------------------------------------------------------------------

async function runExport(slug: string): Promise<ClubExportData> {
  const club = await prisma.club.findUnique({ where: { slug } });
  if (!club) throw new Error(`Club "${slug}" nicht gefunden`);

  const [clubUsers, membershipTypes, numberRanges, members, households] = await Promise.all([
    prisma.clubUser.findMany({
      where: { clubId: club.id },
      include: { user: { include: { accounts: true } } },
    }),
    prisma.membershipType.findMany({
      where: { clubId: club.id },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.numberRange.findMany({ where: { clubId: club.id } }),
    prisma.member.findMany({
      where: { clubId: club.id, deletedAt: null },
      include: {
        membershipPeriods: {
          include: { membershipType: true },
          orderBy: { joinDate: 'asc' },
        },
        household: true,
      },
    }),
    prisma.household.findMany({
      where: { clubId: club.id, deletedAt: null },
    }),
  ]);

  const memberById = new Map(members.map((m) => [m.id, m]));
  const userById = new Map(clubUsers.map((cu) => [cu.user.id, cu.user]));
  const membershipTypeById = new Map(membershipTypes.map((mt) => [mt.id, mt]));

  return {
    meta: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      slug: club.slug,
    },
    club: {
      name: club.name,
      slug: club.slug,
      ...(club.legalName && { legalName: club.legalName }),
      ...(club.shortCode && { shortCode: club.shortCode }),
      ...(club.description && { description: club.description }),
      visibility: club.visibility,
      ...(club.avatarColor && { avatarColor: club.avatarColor }),
      ...(club.foundedAt && { foundedAt: club.foundedAt.toISOString().split('T')[0] }),
      ...(club.street && { street: club.street }),
      ...(club.houseNumber && { houseNumber: club.houseNumber }),
      ...(club.postalCode && { postalCode: club.postalCode }),
      ...(club.city && { city: club.city }),
      ...(club.isRegistered && { isRegistered: club.isRegistered }),
      ...(club.isNonProfit && { isNonProfit: club.isNonProfit }),
      ...(club.iban && { iban: club.iban }),
      ...(club.fiscalYearStartMonth != null && {
        fiscalYearStartMonth: club.fiscalYearStartMonth,
      }),
      ...(club.probationPeriodDays != null && {
        probationPeriodDays: club.probationPeriodDays,
      }),
    },
    users: clubUsers.map((cu) => {
      const cred = cu.user.accounts.find((a) => a.providerId === 'credential');
      return {
        email: cu.user.email,
        name: cu.user.name ?? cu.user.email,
        ...(cred?.password && { passwordHash: cred.password }),
        clubRoles: cu.roles,
        clubStatus: cu.status,
        ...(cu.isExternal && { isExternal: true }),
      };
    }),
    membershipTypes: membershipTypes.map((mt) => ({
      name: mt.name,
      code: mt.code,
      ...(mt.isDefault && { isDefault: true }),
      sortOrder: mt.sortOrder,
      ...(mt.isActive === false && { isActive: false }),
      ...(mt.vote === false && { vote: false }),
      ...(mt.assemblyAttendance === false && { assemblyAttendance: false }),
      ...(mt.eligibleForOffice === false && { eligibleForOffice: false }),
      color: mt.color,
    })),
    numberRanges: numberRanges.map((nr) => ({
      entityType: nr.entityType,
      ...(nr.prefix && { prefix: nr.prefix }),
      currentValue: nr.currentValue,
      ...(nr.padLength !== 4 && { padLength: nr.padLength }),
      ...(nr.yearReset && { yearReset: true }),
    })),
    households: households.map((h) => {
      const primary = h.primaryContactId ? memberById.get(h.primaryContactId) : undefined;
      return {
        name: h.name,
        ...(primary && { primaryContactMemberNumber: primary.memberNumber }),
      };
    }),
    members: members.map((m) => {
      const user = m.userId ? userById.get(m.userId) : undefined;
      const firstPeriod = m.membershipPeriods[0];
      const mt = firstPeriod?.membershipTypeId
        ? membershipTypeById.get(firstPeriod.membershipTypeId)
        : undefined;
      return {
        memberNumber: m.memberNumber,
        firstName: m.firstName,
        lastName: m.lastName,
        ...(m.personType !== 'NATURAL' && { personType: m.personType }),
        ...(m.salutation && { salutation: m.salutation }),
        status: m.status,
        ...(m.email && { email: m.email }),
        ...(m.phone && { phone: m.phone }),
        ...(m.street && { street: m.street }),
        ...(m.houseNumber && { houseNumber: m.houseNumber }),
        ...(m.postalCode && { postalCode: m.postalCode }),
        ...(m.city && { city: m.city }),
        ...(firstPeriod && {
          joinDate: firstPeriod.joinDate.toISOString().split('T')[0],
        }),
        ...(mt && { membershipTypeCode: mt.code }),
        ...(user && { userEmail: user.email }),
        ...(m.household && { householdName: m.household.name }),
        ...(m.householdRole && { householdRole: m.householdRole }),
      };
    }),
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Club Import/Export', () => {
  // -------------------------------------------------------------------------
  // Import — Happy Path
  // -------------------------------------------------------------------------

  describe('Import — Happy Path', () => {
    it('should import a complete club with all sections', async () => {
      const data = loadFixture('complete.yaml');
      const result = await runImport(data);

      expect(result.usersCreated).toBe(3);
      expect(result.clubUsersCreated).toBe(3);
      expect(result.membershipTypesCreated).toBe(3);
      expect(result.numberRangesCreated).toBe(1);
      expect(result.membersCreated).toBe(3);
      expect(result.membershipPeriodsCreated).toBe(3);
      expect(result.householdsCreated).toBe(1);

      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { slug: 'test-complete' },
      });
      expect(club).not.toBeNull();
      expect(club!.name).toBe('Test Verein Komplett e.V.');
      expect(club!.isNonProfit).toBe(true);
    });

    it('should import a minimal club with defaults', async () => {
      const data = loadFixture('minimal.yaml');
      const result = await runImport(data);

      expect(result.usersCreated).toBe(1);
      expect(result.clubUsersCreated).toBe(1);

      const club = await prisma.club.findUnique({
        where: { slug: 'test-minimal' },
      });
      expect(club).not.toBeNull();
      expect(club!.visibility).toBe('PRIVATE');
      expect(club!.avatarColor).toBe('blue');
    });

    it('should hash plaintext password on import', async () => {
      const data = loadFixture('minimal.yaml');
      await runImport(data);

      const user = await prisma.user.findUnique({
        where: { email: 'owner@test-minimal.example.com' },
        include: { accounts: true },
      });
      expect(user).not.toBeNull();

      const account = user!.accounts.find((a) => a.providerId === 'credential');
      expect(account).toBeDefined();
      // scrypt hash format: hex_salt:hex_key
      expect(account!.password).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      // Must not be the plaintext
      expect(account!.password).not.toBe('test-password-123');
    });

    it('should store passwordHash directly without re-hashing', async () => {
      const fakeHash = 'aabbccdd11223344:deadbeef' + 'a'.repeat(112);
      const data: ClubExportData = {
        meta: { version: '1.0', slug: 'test-pwhash' },
        club: { name: 'PW Hash Test', slug: 'test-pwhash' },
        users: [
          {
            email: 'hash@test-pwhash.example.com',
            name: 'Hash User',
            passwordHash: fakeHash,
            clubRoles: ['OWNER'],
          },
        ],
      };

      createdClubSlugs.push('test-pwhash');
      createdUserEmails.push('hash@test-pwhash.example.com');
      await runImport(data);

      const user = await prisma.user.findUnique({
        where: { email: 'hash@test-pwhash.example.com' },
        include: { accounts: true },
      });
      const account = user!.accounts.find((a) => a.providerId === 'credential');
      expect(account!.password).toBe(fakeHash);
    });

    it('should skip account creation when no password is provided', async () => {
      const data: ClubExportData = {
        meta: { version: '1.0', slug: 'test-nopw' },
        club: { name: 'No PW Test', slug: 'test-nopw' },
        users: [
          {
            email: 'nopw@test-nopw.example.com',
            name: 'No Password',
            clubRoles: ['OWNER'],
          },
        ],
      };

      createdClubSlugs.push('test-nopw');
      createdUserEmails.push('nopw@test-nopw.example.com');
      await runImport(data);

      const user = await prisma.user.findUnique({
        where: { email: 'nopw@test-nopw.example.com' },
        include: { accounts: true },
      });
      expect(user).not.toBeNull();
      expect(user!.accounts).toHaveLength(0);
    });

    it('should reuse existing users by email', async () => {
      // Create user first
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing@test-reuse.example.com',
          name: 'Already Here',
          emailVerified: true,
        },
      });
      createdUserEmails.push('existing@test-reuse.example.com');

      const data: ClubExportData = {
        meta: { version: '1.0', slug: 'test-reuse' },
        club: { name: 'Reuse Test', slug: 'test-reuse' },
        users: [
          {
            email: 'existing@test-reuse.example.com',
            name: 'Already Here',
            clubRoles: ['OWNER'],
          },
        ],
      };

      createdClubSlugs.push('test-reuse');
      const result = await runImport(data);

      expect(result.usersCreated).toBe(0);
      expect(result.usersReused).toBe(1);
      expect(result.clubUsersCreated).toBe(1);

      // ClubUser should link to existing user
      const clubUser = await prisma.clubUser.findFirst({
        where: { userId: existingUser.id },
      });
      expect(clubUser).not.toBeNull();
    });

    it('should link households and set primaryContact', async () => {
      const data = loadFixture('complete.yaml');
      await runImport(data);

      const household = await prisma.household.findFirst({
        where: {
          name: 'Familie Eigentümer',
          club: { slug: 'test-complete' },
        },
        include: { members: { where: { deletedAt: null } } },
      });

      expect(household).not.toBeNull();
      expect(household!.primaryContactId).not.toBeNull();
      expect(household!.members).toHaveLength(2); // Anna + Clara
    });
  });

  // -------------------------------------------------------------------------
  // Import — Error Cases
  // -------------------------------------------------------------------------

  describe('Import — Error Cases', () => {
    it('should reject import when slug already exists', async () => {
      const data = loadFixture('minimal.yaml');
      await runImport(data);

      // Try to import again
      await expect(runImport(data)).rejects.toThrow();
    });

    it('should reject when password and passwordHash are both set', async () => {
      await expect(resolvePassword('plaintext', 'hash-value')).rejects.toThrow(
        /password.*passwordHash/i
      );
    });
  });

  // -------------------------------------------------------------------------
  // Export — Happy Path
  // -------------------------------------------------------------------------

  describe('Export — Happy Path', () => {
    it('should export a club with all data', async () => {
      const importData = loadFixture('complete.yaml');
      await runImport(importData);

      const exported = await runExport('test-complete');

      expect(exported.meta.slug).toBe('test-complete');
      expect(exported.club.name).toBe('Test Verein Komplett e.V.');
      expect(exported.users).toHaveLength(3);
      expect(exported.membershipTypes).toHaveLength(3);
      expect(exported.numberRanges).toHaveLength(1);
      expect(exported.members).toHaveLength(3);
      expect(exported.households).toHaveLength(1);
    });

    it('should export passwordHash, never plaintext', async () => {
      const importData = loadFixture('minimal.yaml');
      await runImport(importData);

      const exported = await runExport('test-minimal');

      const user = exported.users!.find((u) => u.email === 'owner@test-minimal.example.com');
      expect(user).toBeDefined();
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);
      expect(user!.password).toBeUndefined();
    });

    it('should produce a round-trip compatible export', async () => {
      const importData = loadFixture('complete.yaml');
      await runImport(importData);

      // Export
      const exported1 = await runExport('test-complete');

      // Clean up club (keep users for reuse)
      const club1 = await prisma.club.findUnique({
        where: { slug: 'test-complete' },
        select: { id: true },
      });
      if (club1) {
        await prisma.membershipPeriod.deleteMany({
          where: { member: { clubId: club1.id } },
        });
        await prisma.memberStatusTransition.deleteMany({
          where: { clubId: club1.id },
        });
        await prisma.member.deleteMany({ where: { clubId: club1.id } });
        await prisma.household.deleteMany({ where: { clubId: club1.id } });
        await prisma.membershipType.deleteMany({ where: { clubId: club1.id } });
        await prisma.numberRange.deleteMany({ where: { clubId: club1.id } });
        await prisma.clubUser.deleteMany({ where: { clubId: club1.id } });
        await prisma.club.delete({ where: { id: club1.id } });
      }

      // Re-import from export (passwords are now hashes)
      await runImport(exported1);

      // Export again
      const exported2 = await runExport('test-complete');

      // Compare (ignore timestamps)
      expect(exported2.club).toEqual(exported1.club);
      expect(exported2.membershipTypes).toEqual(exported1.membershipTypes);
      expect(exported2.numberRanges).toEqual(exported1.numberRanges);
      expect(exported2.members?.length).toBe(exported1.members?.length);
      expect(exported2.households?.length).toBe(exported1.households?.length);
      expect(exported2.users?.length).toBe(exported1.users?.length);

      // Users should have identical hashes (round-trip preserves hash)
      for (const user1 of exported1.users ?? []) {
        const user2 = exported2.users?.find((u) => u.email === user1.email);
        expect(user2?.passwordHash).toBe(user1.passwordHash);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Export — Error Cases
  // -------------------------------------------------------------------------

  describe('Export — Error Cases', () => {
    it('should throw when slug does not exist', async () => {
      await expect(runExport('nonexistent-club-slug')).rejects.toThrow(/nicht gefunden/);
    });
  });
});
