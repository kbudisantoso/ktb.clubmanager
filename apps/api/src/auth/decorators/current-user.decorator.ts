import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUser } from '../guards/session-auth.guard';

/**
 * Parameter decorator to extract the current authenticated user from request.
 *
 * Usage:
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: SessionUser) {
 *   return { email: user.email };
 * }
 *
 * // Or get specific field
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof SessionUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: SessionUser }>();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  }
);
