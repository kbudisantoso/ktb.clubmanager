import type { ExecutionContext } from '@nestjs/common';
import { SetMetadata, createParamDecorator } from '@nestjs/common';

export const CLUB_CONTEXT_KEY = 'require_club_context';

/**
 * Decorator to mark endpoint as requiring club context.
 * The ClubContextGuard will validate user has access to the club.
 */
export const RequireClubContext = () => SetMetadata(CLUB_CONTEXT_KEY, true);

/**
 * Interface for club context attached to request by ClubContextGuard.
 */
export interface ClubContext {
  clubId: string;
  clubSlug: string;
  /** User's roles in this club (multiple roles possible) */
  roles: string[];
}

/**
 * Parameter decorator to extract club context from request.
 * Usage: @GetClubContext() ctx: ClubContext
 */
export const GetClubContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClubContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.clubContext;
  }
);
