import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { BootstrapService } from './bootstrap.service.js';

class BootstrapCheckDto {
  userId!: string;
  email!: string;
}

/**
 * Bootstrap controller for Super Admin promotion.
 *
 * This endpoint is called by Better Auth after user registration
 * to check if the new user should be promoted to Super Admin.
 *
 * Note: This endpoint is intentionally not protected by auth guards
 * since it's called during the registration flow before the user has a session.
 * The bootstrap logic itself is idempotent and safe.
 */
@ApiTags('Admin - Bootstrap')
@Controller('admin/bootstrap')
export class BootstrapController {
  constructor(private bootstrapService: BootstrapService) {}

  @Post('check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Check and promote user to Super Admin if eligible' })
  @ApiBody({ type: BootstrapCheckDto })
  async checkSuperAdmin(
    @Body() dto: BootstrapCheckDto,
  ): Promise<{ promoted: boolean }> {
    const promoted = await this.bootstrapService.checkAndPromoteToSuperAdmin(
      dto.userId,
      dto.email,
    );
    return { promoted };
  }
}
