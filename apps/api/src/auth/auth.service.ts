import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find app user by GoTrue external ID.
   * Used to resolve full user data from JWT payload.
   */
  async findUserByExternalId(externalId: string) {
    return this.prisma.user.findUnique({
      where: { externalId },
    });
  }

  /**
   * Find or create app user from JWT payload.
   * Creates user record on first API access if needed.
   */
  async findOrCreateUser(payload: UserPayload) {
    let user = await this.prisma.user.findUnique({
      where: { externalId: payload.externalId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          externalId: payload.externalId,
          email: payload.email,
        },
      });
    }

    return user;
  }
}
