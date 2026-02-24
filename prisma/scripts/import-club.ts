#!/usr/bin/env tsx
/**
 * Import a club and all related data from a YAML file.
 *
 * Usage: pnpm db:import -- <file.yaml>
 */

import * as fs from 'node:fs';
import yaml from 'js-yaml';
import { createPrismaClient, disconnect } from './lib/prisma.js';
import { resolvePassword } from './lib/password.js';
import type { ClubExportData } from './lib/types.js';

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const filePath = args[0];

  if (!filePath) {
    console.error('Usage: pnpm db:import -- <file.yaml>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Fehler: Datei "${filePath}" nicht gefunden.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = yaml.load(raw) as ClubExportData;

  // Validate structure
  if (!data?.meta?.slug || !data?.club?.name || !data?.club?.slug) {
    console.error('Fehler: YAML-Datei muss meta.slug, club.name und club.slug enthalten.');
    process.exit(1);
  }

  const prisma = createPrismaClient();

  try {
    // Pre-validation
    await preValidate(prisma, data);

    // Resolve passwords before transaction (hashing is async/slow)
    const passwordMap = new Map<string, string>();
    for (const user of data.users ?? []) {
      const resolved = await resolvePassword(user.password, user.passwordHash);
      if (resolved) {
        passwordMap.set(user.email, resolved);
      }
    }

    // Execute import in a transaction
    const result = await prisma.$transaction(
      async (tx) => {
        return executeImport(tx, data, passwordMap);
      },
      { timeout: 60_000 }
    );

    // Summary
    console.log(`\nImport erfolgreich: ${data.club.name}`);
    console.log(`  Slug:              ${data.club.slug}`);
    console.log(`  Users erstellt:    ${result.usersCreated}`);
    console.log(`  Users vorhanden:   ${result.usersReused}`);
    console.log(`  ClubUsers:         ${result.clubUsersCreated}`);
    console.log(`  Mitgliedschaftstypen: ${result.membershipTypesCreated}`);
    console.log(`  Nummernkreise:     ${result.numberRangesCreated}`);
    console.log(`  Mitglieder:        ${result.membersCreated}`);
    console.log(`  Mitgliedschaften:  ${result.membershipPeriodsCreated}`);
    console.log(`  Haushalte:         ${result.householdsCreated}`);
  } finally {
    await disconnect();
  }
}

// ---------------------------------------------------------------------------
// Pre-Validation (before transaction)
// ---------------------------------------------------------------------------

async function preValidate(
  prisma: ReturnType<typeof createPrismaClient>,
  data: ClubExportData
): Promise<void> {
  const errors: string[] = [];

  // Check slug collision
  const existing = await prisma.club.findUnique({
    where: { slug: data.club.slug },
    select: { id: true },
  });
  if (existing) {
    errors.push(`Club mit Slug "${data.club.slug}" existiert bereits. Import abgebrochen.`);
  }

  // Check user password fields (both set = error)
  for (const user of data.users ?? []) {
    if (user.password && user.passwordHash) {
      errors.push(
        `User "${user.email}": Sowohl password als auch passwordHash gesetzt — nur eines erlaubt.`
      );
    }
  }

  // Check membershipTypeCode references in members
  const definedCodes = new Set((data.membershipTypes ?? []).map((mt) => mt.code));
  for (const member of data.members ?? []) {
    if (member.membershipTypeCode && !definedCodes.has(member.membershipTypeCode)) {
      errors.push(
        `Mitglied "${member.memberNumber}": membershipTypeCode "${member.membershipTypeCode}" nicht in membershipTypes definiert.`
      );
    }
  }

  // Check userEmail references in members
  const definedEmails = new Set((data.users ?? []).map((u) => u.email));
  for (const member of data.members ?? []) {
    if (member.userEmail && !definedEmails.has(member.userEmail)) {
      errors.push(
        `Mitglied "${member.memberNumber}": userEmail "${member.userEmail}" nicht in users definiert.`
      );
    }
  }

  // Check householdName references in members
  const definedHouseholds = new Set((data.households ?? []).map((h) => h.name));
  for (const member of data.members ?? []) {
    if (member.householdName && !definedHouseholds.has(member.householdName)) {
      errors.push(
        `Mitglied "${member.memberNumber}": householdName "${member.householdName}" nicht in households definiert.`
      );
    }
  }

  // Check household primaryContactMemberNumber references
  const definedMemberNumbers = new Set((data.members ?? []).map((m) => m.memberNumber));
  for (const household of data.households ?? []) {
    if (
      household.primaryContactMemberNumber &&
      !definedMemberNumbers.has(household.primaryContactMemberNumber)
    ) {
      errors.push(
        `Haushalt "${household.name}": primaryContactMemberNumber "${household.primaryContactMemberNumber}" nicht in members definiert.`
      );
    }
  }

  // Check unique memberNumbers
  const memberNumbers = (data.members ?? []).map((m) => m.memberNumber);
  const dupes = memberNumbers.filter((n, i) => memberNumbers.indexOf(n) !== i);
  if (dupes.length > 0) {
    errors.push(`Doppelte memberNumber(s): ${[...new Set(dupes)].join(', ')}`);
  }

  if (errors.length > 0) {
    console.error('Validierungsfehler:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Import Execution (inside transaction)
// ---------------------------------------------------------------------------

interface ImportResult {
  usersCreated: number;
  usersReused: number;
  clubUsersCreated: number;
  membershipTypesCreated: number;
  numberRangesCreated: number;
  membersCreated: number;
  membershipPeriodsCreated: number;
  householdsCreated: number;
}

async function executeImport(
  tx: Parameters<Parameters<ReturnType<typeof createPrismaClient>['$transaction']>[0]>[0],
  data: ClubExportData,
  passwordMap: Map<string, string>
): Promise<ImportResult> {
  const result: ImportResult = {
    usersCreated: 0,
    usersReused: 0,
    clubUsersCreated: 0,
    membershipTypesCreated: 0,
    numberRangesCreated: 0,
    membersCreated: 0,
    membershipPeriodsCreated: 0,
    householdsCreated: 0,
  };

  // Maps for ID resolution
  const userIdByEmail = new Map<string, string>();
  const membershipTypeIdByCode = new Map<string, string>();
  const memberIdByNumber = new Map<string, string>();
  const householdIdByName = new Map<string, string>();

  // -----------------------------------------------------------------------
  // 1. Users + Accounts
  // -----------------------------------------------------------------------
  for (const userData of data.users ?? []) {
    // Check if user exists
    const existingUser = await tx.user.findUnique({
      where: { email: userData.email },
      select: { id: true },
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      result.usersReused++;
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
      result.usersCreated++;

      // Create credential account if password available
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

  // -----------------------------------------------------------------------
  // 2. Club
  // -----------------------------------------------------------------------
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
      inviteCode: clubData.inviteCode,
      fiscalYearStartMonth: clubData.fiscalYearStartMonth,
      probationPeriodDays: clubData.probationPeriodDays,
      tierId: defaultTier?.id,
    },
  });

  // -----------------------------------------------------------------------
  // 3. ClubUsers
  // -----------------------------------------------------------------------
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
    result.clubUsersCreated++;
  }

  // -----------------------------------------------------------------------
  // 4. MembershipTypes
  // -----------------------------------------------------------------------
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
    result.membershipTypesCreated++;
  }

  // Set defaultMembershipTypeId if a type is marked as default
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

  // -----------------------------------------------------------------------
  // 5. NumberRanges
  // -----------------------------------------------------------------------
  for (const nrData of data.numberRanges ?? []) {
    await tx.numberRange.create({
      data: {
        clubId: club.id,
        entityType: nrData.entityType,
        prefix: nrData.prefix ?? '',
        currentValue: nrData.currentValue ?? 0,
        padLength: nrData.padLength ?? 4,
        yearReset: nrData.yearReset ?? false,
        lastResetYear: nrData.lastResetYear,
      },
    });
    result.numberRangesCreated++;
  }

  // -----------------------------------------------------------------------
  // 6. Members (without households)
  // -----------------------------------------------------------------------
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
        statusChangeReason: memberData.statusChangeReason,
        cancellationDate: memberData.cancellationDate
          ? new Date(memberData.cancellationDate)
          : undefined,
        cancellationReceivedAt: memberData.cancellationReceivedAt
          ? new Date(memberData.cancellationReceivedAt)
          : undefined,
        userId,
      },
    });

    memberIdByNumber.set(memberData.memberNumber, member.id);

    // Mark ClubUser as non-external if member is linked
    if (userId) {
      await tx.clubUser.updateMany({
        where: { userId, clubId: club.id },
        data: { isExternal: false },
      });
    }

    result.membersCreated++;
  }

  // -----------------------------------------------------------------------
  // 7. MembershipPeriods
  // -----------------------------------------------------------------------
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
    result.membershipPeriodsCreated++;
  }

  // -----------------------------------------------------------------------
  // 8. Households → update members → set primaryContact
  // -----------------------------------------------------------------------
  for (const hhData of data.households ?? []) {
    const household = await tx.household.create({
      data: {
        clubId: club.id,
        name: hhData.name,
      },
    });
    householdIdByName.set(hhData.name, household.id);
    result.householdsCreated++;
  }

  // Update members with household info
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

  // Set primaryContactId on households
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

  return result;
}

main().catch((err) => {
  console.error('Import fehlgeschlagen:', err.message);
  process.exit(1);
});
