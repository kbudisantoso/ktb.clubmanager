import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TiersService } from './tiers.service.js';
import { CreateTierDto } from './dto/create-tier.dto.js';
import { UpdateTierDto } from './dto/update-tier.dto.js';
import { SuperAdminOnly } from '../../common/decorators/super-admin.decorator.js';

/**
 * Controller for tier management.
 *
 * All endpoints require Super Admin access.
 * Used by the Kommandozentrale (system admin panel).
 */
@ApiTags('Admin - Tiers')
@ApiBearerAuth()
@Controller('admin/tiers')
@SuperAdminOnly()
export class TiersController {
  constructor(private tiersService: TiersService) {}

  @Post()
  @ApiOperation({ summary: 'Neues Tier erstellen' })
  @ApiResponse({ status: 201, description: 'Tier erstellt' })
  @ApiResponse({ status: 400, description: 'Name bereits vergeben' })
  @ApiResponse({ status: 403, description: 'Super Admin erforderlich' })
  create(@Body() dto: CreateTierDto) {
    return this.tiersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Alle Tiers auflisten' })
  @ApiResponse({ status: 200, description: 'Liste aller Tiers mit Verein-Anzahl' })
  findAll() {
    return this.tiersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tier nach ID abrufen' })
  @ApiResponse({ status: 200, description: 'Tier gefunden' })
  @ApiResponse({ status: 404, description: 'Tier nicht gefunden' })
  findOne(@Param('id') id: string) {
    return this.tiersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Tier aktualisieren' })
  @ApiResponse({ status: 200, description: 'Tier aktualisiert' })
  @ApiResponse({ status: 400, description: 'Name bereits vergeben' })
  @ApiResponse({ status: 404, description: 'Tier nicht gefunden' })
  update(@Param('id') id: string, @Body() dto: UpdateTierDto) {
    return this.tiersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Tier löschen' })
  @ApiResponse({ status: 204, description: 'Tier gelöscht' })
  @ApiResponse({
    status: 400,
    description: 'Seeded Tier oder Vereine zugewiesen',
  })
  @ApiResponse({ status: 404, description: 'Tier nicht gefunden' })
  remove(@Param('id') id: string) {
    return this.tiersService.remove(id);
  }
}
