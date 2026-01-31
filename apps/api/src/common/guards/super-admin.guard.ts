import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SUPER_ADMIN_KEY } from '../decorators/super-admin.decorator.js';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint requires Super Admin
    const requiresSuperAdmin = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresSuperAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
