import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ClubDeletionLogService } from '../../club-deletion/club-deletion-log.service.js';
import { SuperAdminOnly } from '../../common/decorators/super-admin.decorator.js';

/**
 * Controller for SuperAdmin deletion log queries.
 *
 * Provides read access to the ClubDeletionLog table for
 * the "Gelöschte Vereine" admin page.
 */
@ApiTags('Admin - Deletion Logs')
@ApiBearerAuth()
@Controller('admin/deletion-logs')
@SuperAdminOnly()
export class DeletionLogController {
  constructor(private clubDeletionLogService: ClubDeletionLogService) {}

  @Get()
  @ApiOperation({ summary: 'Alle Löschprotokolle abrufen' })
  @ApiResponse({ status: 200, description: 'Liste aller Löschprotokolle' })
  async findAll() {
    return this.clubDeletionLogService.findAll();
  }
}
