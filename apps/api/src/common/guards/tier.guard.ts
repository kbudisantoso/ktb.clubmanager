import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FEATURE_KEY, TierFeature } from '../decorators/feature.decorator.js';
import type { Tier } from '../../../../../prisma/generated/client/index.js';

/**
 * Guard that checks if club's tier has required feature enabled.
 *
 * Must run AFTER ClubContextGuard (needs clubContext set on request).
 *
 * Behavior:
 * 1. Read FEATURE_KEY metadata from handler/class
 * 2. If no feature required, allow access
 * 3. Super Admin bypass (full access)
 * 4. Lookup club's tier and check feature flag
 * 5. No tier = all features enabled (default behavior)
 *
 * Feature flag mapping:
 * - 'sepa' -> tier.sepaEnabled
 * - 'reports' -> tier.reportsEnabled
 * - 'bankImport' -> tier.bankImportEnabled
 *
 * Error format follows CONTEXT.md structured error pattern.
 */
@Injectable()
export class TierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<TierFeature>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Super Admin bypass
    if (await this.isSuperAdmin(request.user?.id)) {
      return true;
    }

    const clubContext = request.clubContext;
    if (!clubContext) {
      throw new ForbiddenException({
        code: 'CLUB_ACCESS_DENIED',
        message: 'Vereinskontext erforderlich',
      });
    }

    // Lookup club tier
    const club = await this.prisma.club.findUnique({
      where: { id: clubContext.clubId },
      include: { tier: true },
    });

    // No tier = all features enabled (default behavior)
    if (!club?.tier) {
      return true;
    }

    const featureEnabled = this.checkFeature(club.tier, requiredFeature);

    if (!featureEnabled) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: 'Diese Funktion ist in deinem Tarif nicht verfügbar',
        details: { feature: requiredFeature },
      });
    }

    return true;
  }

  private checkFeature(tier: Tier, feature: TierFeature): boolean {
    switch (feature) {
      case 'sepa':
        return tier.sepaEnabled;
      case 'reports':
        return tier.reportsEnabled;
      case 'bankImport':
        return tier.bankImportEnabled;
      default:
        return false;
    }
  }

  private async isSuperAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    return user?.isSuperAdmin ?? false;
  }
}
