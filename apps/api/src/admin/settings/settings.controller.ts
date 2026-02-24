import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppSettingsService } from '../../settings/app-settings.service.js';
import { SuperAdminOnly } from '../../common/decorators/super-admin.decorator.js';

class UpdateSettingsDto {
  'club.selfServiceCreation'?: boolean;
  'club.defaultVisibility'?: 'PUBLIC' | 'PRIVATE';
  'club.defaultTierId'?: string | null;
  'tier.graceperiodDays'?: number;
  'mode.saas'?: boolean;
  'club.minDeletionGraceDays'?: number;
}

/**
 * Controller for application-wide settings.
 *
 * Only Super Admins can view and modify these settings.
 */
@ApiTags('Admin - Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@SuperAdminOnly()
export class AdminSettingsController {
  constructor(private appSettings: AppSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all application settings' })
  async getAll() {
    return this.appSettings.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'Update application settings' })
  async update(@Body() dto: UpdateSettingsDto) {
    // Update each setting that was provided
    const updates: Promise<void>[] = [];

    if (dto['club.selfServiceCreation'] !== undefined) {
      updates.push(
        this.appSettings.set('club.selfServiceCreation', dto['club.selfServiceCreation'])
      );
    }
    if (dto['club.defaultVisibility'] !== undefined) {
      updates.push(this.appSettings.set('club.defaultVisibility', dto['club.defaultVisibility']));
    }
    if (dto['club.defaultTierId'] !== undefined) {
      updates.push(this.appSettings.set('club.defaultTierId', dto['club.defaultTierId']));
    }
    if (dto['tier.graceperiodDays'] !== undefined) {
      updates.push(this.appSettings.set('tier.graceperiodDays', dto['tier.graceperiodDays']));
    }
    if (dto['mode.saas'] !== undefined) {
      updates.push(this.appSettings.set('mode.saas', dto['mode.saas']));
    }
    if (dto['club.minDeletionGraceDays'] !== undefined) {
      updates.push(
        this.appSettings.set('club.minDeletionGraceDays', dto['club.minDeletionGraceDays'])
      );
    }

    await Promise.all(updates);

    return this.appSettings.getAll();
  }
}
