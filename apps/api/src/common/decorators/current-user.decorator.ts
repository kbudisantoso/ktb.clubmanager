import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../../auth/strategies/jwt.strategy';

/**
 * Extract current user from request.
 *
 * @example
 * // Get full user context
 * @Get('me')
 * getMe(@CurrentUser() user: UserPayload) { ... }
 *
 * @example
 * // Get specific property
 * @Get('me')
 * getMe(@CurrentUser('externalId') externalId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof UserPayload | undefined,
    ctx: ExecutionContext,
  ): UserPayload | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
