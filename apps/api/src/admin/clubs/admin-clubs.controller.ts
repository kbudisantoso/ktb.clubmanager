import { Controller, Get, Post, Param, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminClubsService } from './admin-clubs.service.js';
import { SuperAdminOnly } from '../../common/decorators/super-admin.decorator.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

/**
 * Controller for SuperAdmin club deletion management.
 *
 * All endpoints require Super Admin access.
 * Provides oversight and control over club deletions.
 */
@ApiTags('Admin - Clubs')
@ApiBearerAuth()
@Controller('admin/clubs')
@SuperAdminOnly()
export class AdminClubsController {
  constructor(private adminClubsService: AdminClubsService) {}

  @Get('pending-deletions')
  @ApiOperation({ summary: 'Ausstehende Vereinslöschungen auflisten' })
  @ApiResponse({ status: 200, description: 'Liste aller ausstehenden Löschungen' })
  async listPendingDeletions() {
    return this.adminClubsService.listPendingDeletions();
  }

  @Post(':id/cancel-deletion')
  @ApiOperation({ summary: 'Vereinslöschung abbrechen' })
  @ApiResponse({ status: 200, description: 'Löschung abgebrochen' })
  @ApiResponse({ status: 400, description: 'Verein nicht deaktiviert oder bereits gelöscht' })
  @ApiResponse({ status: 404, description: 'Verein nicht gefunden' })
  async cancelDeletion(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.adminClubsService.cancelDeletion(id, req.user.id);
  }

  @Post(':id/force-delete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verein sofort endgültig löschen' })
  @ApiResponse({ status: 200, description: 'Verein endgültig gelöscht' })
  @ApiResponse({ status: 400, description: 'Verein bereits gelöscht' })
  @ApiResponse({ status: 404, description: 'Verein nicht gefunden' })
  async forceDelete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.adminClubsService.forceDelete(id, req.user.id);
    return { message: 'Verein endgültig gelöscht' };
  }
}
