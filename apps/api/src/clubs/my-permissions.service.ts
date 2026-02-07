import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { getUserPermissions } from '../common/permissions/permission-map.js';
import type { ClubRole } from '../../../../prisma/generated/client/index.js';
import type { MyPermissionsResponseDto, TierFeaturesDto } from './dto/my-permissions.dto.js';

@Injectable()
export class MyPermissionsService {
  constructor(private prisma: PrismaService) {}

  async getMyPermissions(clubId: string, roles: ClubRole[]): Promise<MyPermissionsResponseDto> {
    // Derive permissions from roles
    const permissions = getUserPermissions(roles);

    // Get tier features
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: { tier: true },
    });

    // Default features if no tier
    const features: TierFeaturesDto = {
      sepa: club?.tier?.sepaEnabled ?? true,
      reports: club?.tier?.reportsEnabled ?? true,
      bankImport: club?.tier?.bankImportEnabled ?? true,
    };

    return {
      permissions,
      features,
      roles: roles as string[],
    };
  }
}
