import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppSettingsService } from '../settings/app-settings.service.js';
import { MembershipTypesService } from '../membership-types/membership-types.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { DeactivateClubDto } from './dto/deactivate-club.dto.js';
import { generateSlug, validateSlug, formatInviteCode, generateInviteCode } from '@ktb/shared';

@Injectable()
export class ClubsService {
  constructor(
    private prisma: PrismaService,
    private appSettings: AppSettingsService,
    private membershipTypes: MembershipTypesService
  ) {}

  /**
   * Create a new club with the user as OWNER.
   */
  async create(dto: CreateClubDto, userId: string, isSuperAdmin: boolean) {
    // Check self-service permission
    const selfServiceEnabled = await this.appSettings.isSelfServiceEnabled();
    if (!selfServiceEnabled && !isSuperAdmin) {
      throw new ForbiddenException('Nur für Plattform-Admins oder bei aktiviertem Self-Service');
    }

    // Generate or validate slug
    let slug = dto.slug || generateSlug(dto.name);

    // Validate slug format
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      throw new BadRequestException(slugValidation.reason);
    }

    // Check slug uniqueness
    const existingSlug = await this.prisma.club.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      // Try adding numeric suffix
      let suffix = 1;
      while (suffix < 100) {
        const newSlug = `${slug}-${suffix}`;
        const exists = await this.prisma.club.findUnique({
          where: { slug: newSlug },
        });
        if (!exists) {
          slug = newSlug;
          break;
        }
        suffix++;
      }

      if (suffix >= 100) {
        throw new BadRequestException('URL-Pfad konnte nicht generiert werden');
      }
    }

    // Get default tier if not specified
    let tierId: string | undefined = dto.tierId;
    if (!tierId) {
      const defaultTier = await this.appSettings.getDefaultTierId();
      tierId = defaultTier ?? undefined;
    }

    // Get default visibility if not specified
    const visibility = dto.visibility || (await this.appSettings.getDefaultVisibility());

    // Generate invite code for private clubs
    const inviteCode = visibility === 'PRIVATE' ? generateInviteCode() : null;

    // Create club and assign creator as OWNER
    const club = await this.prisma.club.create({
      data: {
        name: dto.name,
        slug,
        legalName: dto.legalName,
        shortCode: dto.shortCode,
        description: dto.description,
        visibility,
        inviteCode,
        avatarColor: dto.avatarColor || 'blue',
        tierId,
        clubUsers: {
          create: {
            userId,
            roles: ['OWNER'],
            status: 'ACTIVE',
          },
        },
      },
      include: {
        tier: true,
        _count: {
          select: { clubUsers: true, members: true },
        },
      },
    });

    // Seed default membership types for the new club
    await this.membershipTypes.seedDefaults(club.id);

    return this.formatClubResponse(club, ['OWNER']);
  }

  /**
   * Get clubs the current user belongs to.
   * Returns clubs array and meta info (canCreateClub permission).
   */
  async findMyClubs(userId: string, isSuperAdmin: boolean) {
    const clubUsers = await this.prisma.clubUser.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        club: { deletedAt: null },
      },
      include: {
        club: {
          include: {
            tier: true,
            _count: {
              select: { clubUsers: true, members: true },
            },
          },
        },
      },
      orderBy: {
        club: { name: 'asc' },
      },
    });

    const clubs = clubUsers.map((cu) => this.formatClubResponse(cu.club, cu.roles, cu.joinedAt));

    // Check if user can create clubs
    const selfServiceEnabled = await this.appSettings.isSelfServiceEnabled();
    const canCreateClub = isSuperAdmin || selfServiceEnabled;

    return {
      clubs,
      meta: {
        canCreateClub,
      },
    };
  }

  /**
   * Get a single club by slug (requires membership or Super Admin).
   */
  async findBySlug(slug: string, userId: string, isSuperAdmin: boolean) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
      include: {
        tier: true,
        _count: {
          select: { clubUsers: true, members: true },
        },
      },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Check access
    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: { userId, clubId: club.id, status: 'ACTIVE' },
      });

      if (!membership) {
        throw new ForbiddenException('Kein Zugriff auf diesen Verein');
      }

      return this.formatClubResponse(club, membership.roles);
    }

    return this.formatClubResponse(club, []);
  }

  /**
   * Update club details.
   */
  async update(slug: string, dto: UpdateClubDto, userId: string, isSuperAdmin: boolean) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Check permission (OWNER, ADMIN, or Super Admin)
    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: {
          userId,
          clubId: club.id,
          status: 'ACTIVE',
          roles: { hasSome: ['OWNER', 'ADMIN'] },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Nur Vereinsadministratoren können Einstellungen ändern');
      }
    }

    // Convert foundedAt string to Date, handle null (clear) and undefined (no change)
    let foundedAtValue: Date | null | undefined = undefined;
    if (dto.foundedAt !== undefined) {
      foundedAtValue = dto.foundedAt ? new Date(dto.foundedAt) : null;
    }

    const updated = await this.prisma.club.update({
      where: { id: club.id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        description: dto.description,
        visibility: dto.visibility,
        avatarColor: dto.avatarColor,
        tierId: dto.tierId,
        // Stammdaten
        shortCode: dto.shortCode,
        foundedAt: foundedAtValue,
        // Adresse & Kontakt
        street: dto.street,
        houseNumber: dto.houseNumber,
        postalCode: dto.postalCode,
        city: dto.city,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        // Vereinsregister
        isRegistered: dto.isRegistered,
        registryCourt: dto.registryCourt,
        registryNumber: dto.registryNumber,
        clubPurpose: dto.clubPurpose,
        clubSpecialForm: dto.clubSpecialForm,
        // Steuerdaten
        taxNumber: dto.taxNumber,
        vatId: dto.vatId,
        taxOffice: dto.taxOffice,
        isNonProfit: dto.isNonProfit,
        // Bankverbindung
        iban: dto.iban,
        bic: dto.bic,
        bankName: dto.bankName,
        accountHolder: dto.accountHolder,
        // Betriebseinstellungen
        fiscalYearStartMonth: dto.fiscalYearStartMonth,
        defaultMembershipTypeId: dto.defaultMembershipTypeId,
        probationPeriodDays: dto.probationPeriodDays,
        // Logo
        logoFileId: dto.logoFileId,
      },
      include: {
        tier: true,
        _count: {
          select: { clubUsers: true, members: true },
        },
      },
    });

    return this.formatClubResponse(updated);
  }

  /**
   * Soft delete a club.
   */
  async remove(slug: string, userId: string, isSuperAdmin: boolean) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Only OWNER or Super Admin can delete
    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: {
          userId,
          clubId: club.id,
          status: 'ACTIVE',
          roles: { has: 'OWNER' },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Nur der Vereinsinhaber kann den Verein löschen');
      }
    }

    await this.prisma.club.update({
      where: { id: club.id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
  }

  /**
   * Regenerate invite code (ADMIN/OWNER only).
   */
  async regenerateInviteCode(slug: string, userId: string, isSuperAdmin: boolean) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Check permission
    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: {
          userId,
          clubId: club.id,
          status: 'ACTIVE',
          roles: { hasSome: ['OWNER', 'ADMIN'] },
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'Nur Vereinsadministratoren können den Einladungscode erneuern'
        );
      }
    }

    const newCode = generateInviteCode();

    const updated = await this.prisma.club.update({
      where: { id: club.id },
      data: { inviteCode: newCode },
    });

    return { inviteCode: formatInviteCode(updated.inviteCode!) };
  }

  /**
   * Check if a slug is available.
   */
  async checkSlugAvailability(slug: string) {
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return { available: false, reason: validation.reason };
    }

    const existing = await this.prisma.club.findUnique({
      where: { slug },
    });

    return { available: !existing };
  }

  /**
   * Leave a club (self-service).
   * OWNERs cannot leave - they must transfer ownership first.
   */
  async leaveClub(slug: string, userId: string) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    const membership = await this.prisma.clubUser.findFirst({
      where: {
        userId,
        clubId: club.id,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new BadRequestException('Du bist kein Mitglied dieses Vereins');
    }

    // OWNERs cannot leave
    if (membership.roles.includes('OWNER')) {
      throw new ForbiddenException(
        'Als Verantwortlicher kannst du den Verein nicht verlassen. Übertrage zuerst die Verantwortung.'
      );
    }

    // Delete the membership
    await this.prisma.clubUser.delete({
      where: { id: membership.id },
    });

    return { message: 'Du hast den Verein verlassen' };
  }

  /**
   * List all clubs (Super Admin only).
   */
  async findAll() {
    const clubs = await this.prisma.club.findMany({
      where: { deletedAt: null },
      include: {
        tier: true,
        _count: {
          select: { clubUsers: true, members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clubs.map((club) => this.formatClubResponse(club));
  }

  /**
   * List public clubs for discovery.
   */
  async findPublicClubs() {
    const clubs = await this.prisma.club.findMany({
      where: {
        visibility: 'PUBLIC',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatarColor: true,
        logoFileId: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clubs;
  }

  /**
   * Deactivate a club (initiates grace period before deletion).
   * Only OWNER or Super Admin can deactivate.
   */
  async deactivate(slug: string, dto: DeactivateClubDto, userId: string, isSuperAdmin: boolean) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Only OWNER or Super Admin can deactivate
    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: {
          userId,
          clubId: club.id,
          status: 'ACTIVE',
          roles: { has: 'OWNER' },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Nur der Vereinsinhaber kann den Verein deaktivieren');
      }
    }

    // Verify confirmation name matches
    if (dto.confirmationName !== club.name) {
      throw new BadRequestException('Der eingegebene Vereinsname stimmt nicht überein');
    }

    // Check not already deactivated
    if (club.deactivatedAt) {
      throw new BadRequestException('Verein ist bereits deaktiviert');
    }

    // Validate grace period >= SuperAdmin minimum
    const minGraceDays = await this.appSettings.get('club.minDeletionGraceDays');
    const effectiveGraceDays = Math.max(dto.gracePeriodDays, minGraceDays);

    // Calculate scheduled deletion date
    const now = new Date();
    const scheduledDeletionAt = new Date(now);
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + effectiveGraceDays);

    // Count members for deletion log
    const memberCount = await this.prisma.member.count({
      where: { clubId: club.id, deletedAt: null },
    });

    // Transaction: update club + create deletion log
    const [updated] = await this.prisma.$transaction([
      this.prisma.club.update({
        where: { id: club.id },
        data: {
          deactivatedAt: now,
          deactivatedBy: userId,
          scheduledDeletionAt,
          gracePeriodDays: effectiveGraceDays,
        },
        include: {
          tier: true,
          _count: {
            select: { clubUsers: true, members: true },
          },
        },
      }),
      this.prisma.clubDeletionLog.create({
        data: {
          clubName: club.name,
          clubSlug: club.slug,
          initiatedBy: userId,
          deactivatedAt: now,
          scheduledDeletionAt,
          memberCount,
          notificationEvents: [
            {
              type: 'T_GRACE',
              timestamp: now.toISOString(),
              message: 'Verein deaktiviert, Schonfrist gestartet',
            },
          ],
        },
      }),
    ]);

    return this.formatClubResponse(updated);
  }

  /**
   * Reactivate a deactivated club (cancel deletion).
   * Only OWNER or Super Admin can reactivate.
   */
  async reactivate(slug: string, userId: string, isSuperAdmin: boolean) {
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
    });

    if (!club) {
      throw new NotFoundException('Verein nicht gefunden');
    }

    // Check it IS deactivated
    if (!club.deactivatedAt) {
      throw new BadRequestException('Verein ist nicht deaktiviert');
    }

    // Only OWNER or Super Admin can reactivate
    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: {
          userId,
          clubId: club.id,
          status: 'ACTIVE',
          roles: { has: 'OWNER' },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Nur der Vereinsinhaber kann den Verein reaktivieren');
      }
    }

    const now = new Date();

    // Transaction: clear deactivation fields + cancel deletion log
    const [updated] = await this.prisma.$transaction([
      this.prisma.club.update({
        where: { id: club.id },
        data: {
          deactivatedAt: null,
          deactivatedBy: null,
          scheduledDeletionAt: null,
          gracePeriodDays: null,
        },
        include: {
          tier: true,
          _count: {
            select: { clubUsers: true, members: true },
          },
        },
      }),
      this.prisma.clubDeletionLog.updateMany({
        where: {
          clubSlug: club.slug,
          cancelled: false,
          deletedAt: null,
        },
        data: {
          cancelled: true,
          cancelledAt: now,
          cancelledBy: userId,
        },
      }),
    ]);

    return this.formatClubResponse(updated);
  }

  private formatClubResponse(
    club: {
      id: string;
      name: string;
      slug: string;
      legalName: string | null;
      description: string | null;
      visibility: string;
      inviteCode: string | null;
      avatarColor: string | null;
      // Stammdaten
      shortCode: string | null;
      foundedAt: Date | null;
      // Adresse & Kontakt
      street: string | null;
      houseNumber: string | null;
      postalCode: string | null;
      city: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
      // Vereinsregister
      isRegistered: boolean;
      registryCourt: string | null;
      registryNumber: string | null;
      clubPurpose: string | null;
      clubSpecialForm: string | null;
      // Steuerdaten
      taxNumber: string | null;
      vatId: string | null;
      taxOffice: string | null;
      isNonProfit: boolean;
      // Bankverbindung
      iban: string | null;
      bic: string | null;
      bankName: string | null;
      accountHolder: string | null;
      // Betriebseinstellungen
      fiscalYearStartMonth: number | null;
      defaultMembershipTypeId: string | null;
      probationPeriodDays: number | null;
      // Logo
      logoFileId: string | null;
      // Deactivation
      deactivatedAt: Date | null;
      deactivatedBy: string | null;
      scheduledDeletionAt: Date | null;
      gracePeriodDays: number | null;
      // Relations
      tierId: string | null;
      tier?: { id: string; name: string } | null;
      createdAt: Date;
      updatedAt: Date;
      _count?: { clubUsers?: number; members?: number };
    },
    roles?: string[],
    joinedAt?: Date
  ) {
    return {
      id: club.id,
      name: club.name,
      slug: club.slug,
      legalName: club.legalName ?? undefined,
      description: club.description ?? undefined,
      visibility: club.visibility as 'PUBLIC' | 'PRIVATE',
      inviteCode: club.inviteCode ? formatInviteCode(club.inviteCode) : undefined,
      avatarColor: club.avatarColor ?? undefined,
      // Stammdaten
      shortCode: club.shortCode ?? undefined,
      foundedAt: club.foundedAt ? club.foundedAt.toISOString().split('T')[0] : undefined,
      // Adresse & Kontakt
      street: club.street ?? undefined,
      houseNumber: club.houseNumber ?? undefined,
      postalCode: club.postalCode ?? undefined,
      city: club.city ?? undefined,
      phone: club.phone ?? undefined,
      email: club.email ?? undefined,
      website: club.website ?? undefined,
      // Vereinsregister
      isRegistered: club.isRegistered,
      registryCourt: club.registryCourt ?? undefined,
      registryNumber: club.registryNumber ?? undefined,
      clubPurpose: club.clubPurpose ?? undefined,
      clubSpecialForm: club.clubSpecialForm ?? undefined,
      // Steuerdaten
      taxNumber: club.taxNumber ?? undefined,
      vatId: club.vatId ?? undefined,
      taxOffice: club.taxOffice ?? undefined,
      isNonProfit: club.isNonProfit,
      // Bankverbindung
      iban: club.iban ?? undefined,
      bic: club.bic ?? undefined,
      bankName: club.bankName ?? undefined,
      accountHolder: club.accountHolder ?? undefined,
      // Betriebseinstellungen
      fiscalYearStartMonth: club.fiscalYearStartMonth ?? undefined,
      defaultMembershipTypeId: club.defaultMembershipTypeId ?? undefined,
      probationPeriodDays: club.probationPeriodDays ?? undefined,
      // Logo
      logoFileId: club.logoFileId ?? undefined,
      // Deactivation
      deactivatedAt: club.deactivatedAt?.toISOString() ?? null,
      deactivatedBy: club.deactivatedBy ?? null,
      scheduledDeletionAt: club.scheduledDeletionAt?.toISOString() ?? null,
      gracePeriodDays: club.gracePeriodDays ?? null,
      // Relations & meta
      tierId: club.tierId ?? undefined,
      tier: club.tier ?? undefined,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
      roles,
      joinedAt,
      userCount: club._count?.clubUsers,
      memberCount: club._count?.members,
    };
  }
}
