import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppSettingsService } from '../settings/app-settings.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { generateSlug, validateSlug, formatInviteCode, generateInviteCode } from '@ktb/shared';

@Injectable()
export class ClubsService {
  constructor(
    private prisma: PrismaService,
    private appSettings: AppSettingsService,
  ) {}

  /**
   * Create a new club with the user as OWNER.
   */
  async create(dto: CreateClubDto, userId: string, isSuperAdmin: boolean) {
    // Check self-service permission
    const selfServiceEnabled = await this.appSettings.isSelfServiceEnabled();
    if (!selfServiceEnabled && !isSuperAdmin) {
      throw new ForbiddenException(
        'Nur für Plattform-Admins oder bei aktiviertem Self-Service',
      );
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
    const visibility =
      dto.visibility || (await this.appSettings.getDefaultVisibility());

    // Generate invite code for private clubs
    const inviteCode = visibility === 'PRIVATE' ? generateInviteCode() : null;

    // Generate default avatar initials from name
    const avatarInitials = dto.avatarInitials || this.generateInitials(dto.name);

    // Create club and assign creator as OWNER
    const club = await this.prisma.club.create({
      data: {
        name: dto.name,
        slug,
        legalName: dto.legalName,
        description: dto.description,
        visibility,
        inviteCode,
        avatarInitials,
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

    const clubs = clubUsers.map((cu) =>
      this.formatClubResponse(cu.club, cu.roles, cu.joinedAt),
    );

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
  async update(
    slug: string,
    dto: UpdateClubDto,
    userId: string,
    isSuperAdmin: boolean,
  ) {
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

    const updated = await this.prisma.club.update({
      where: { id: club.id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        description: dto.description,
        visibility: dto.visibility,
        avatarInitials: dto.avatarInitials,
        avatarColor: dto.avatarColor,
        tierId: dto.tierId,
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
  async regenerateInviteCode(
    slug: string,
    userId: string,
    isSuperAdmin: boolean,
  ) {
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
          'Nur Vereinsadministratoren können den Einladungscode erneuern',
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
        'Als Inhaber kannst du den Verein nicht verlassen. Übertrage zuerst die Inhaberschaft.',
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
        avatarUrl: true,
        avatarInitials: true,
        avatarColor: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return clubs;
  }

  // Helper methods

  private generateInitials(name: string): string {
    // Extract initials from name (up to 3 chars)
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      return words
        .slice(0, 3)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    }
    if (words.length === 2) {
      return words
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    }
    return name.slice(0, 3).toUpperCase();
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
      avatarUrl: string | null;
      avatarInitials: string | null;
      avatarColor: string | null;
      tierId: string | null;
      tier?: { id: string; name: string } | null;
      createdAt: Date;
      updatedAt: Date;
      _count?: { clubUsers?: number; members?: number };
    },
    roles?: string[],
    joinedAt?: Date,
  ) {
    return {
      id: club.id,
      name: club.name,
      slug: club.slug,
      legalName: club.legalName ?? undefined,
      description: club.description ?? undefined,
      visibility: club.visibility as 'PUBLIC' | 'PRIVATE',
      inviteCode: club.inviteCode ? formatInviteCode(club.inviteCode) : undefined,
      avatarUrl: club.avatarUrl ?? undefined,
      avatarInitials: club.avatarInitials ?? undefined,
      avatarColor: club.avatarColor ?? undefined,
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
