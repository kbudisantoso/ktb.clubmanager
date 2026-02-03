import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * User payload attached to request after session validation.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

/**
 * Session-based authentication guard for Better Auth.
 *
 * Validates sessions by:
 * 1. Extracting session token from cookie or Authorization header
 * 2. Querying the session table directly via Prisma
 * 3. Checking session is not expired
 * 4. Attaching user to request
 *
 * Routes marked with @Public() decorator bypass authentication.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No session token provided');
    }

    // Query session from database
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session token');
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired');
    }

    // Attach user to request
    const user: SessionUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    };

    (request as Request & { user: SessionUser }).user = user;

    return true;
  }

  /**
   * Extract session token from request.
   *
   * Checks in order:
   * 1. Authorization: Bearer <token> header
   * 2. better-auth.session_token cookie
   */
  private extractToken(request: Request): string | null {
    // Check Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check cookie
    // Better Auth signs the token: format is "<tokenId>.<signature>"
    // We only need the tokenId part to query the database
    const cookieToken = request.cookies?.['better-auth.session_token'];
    if (cookieToken) {
      // Extract just the token ID (before the dot)
      const [tokenId] = cookieToken.split('.');
      return tokenId;
    }

    return null;
  }
}
