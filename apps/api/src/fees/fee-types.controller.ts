import { Controller, Get, Post, Patch, Delete, Put, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireClubContext, GetClubContext } from '../common/decorators/club-context.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { FeeTypesService } from './fee-types.service.js';
import { CreateFeeTypeDto } from './dto/create-fee-type.dto.js';
import { UpdateFeeTypeDto } from './dto/update-fee-type.dto.js';
import { UpsertCrossTableEntryDto } from './dto/upsert-cross-table-entry.dto.js';
import type { ClubContext } from '../common/decorators/club-context.decorator.js';

@ApiTags('Fee Types')
@ApiBearerAuth()
@Controller('clubs/:slug/fees/types')
@RequireClubContext()
export class FeeTypesController {
  constructor(private feeTypesService: FeeTypesService) {}

  // ─── Cross-Table Endpoints (static path — BEFORE :id routes) ──────

  @Get('cross-table')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'Get the MembershipType x FeeType fee matrix' })
  @ApiResponse({ status: 200, description: 'Cross-table entries' })
  async getCrossTable(@GetClubContext() ctx: ClubContext) {
    return this.feeTypesService.findCrossTable(ctx.clubId);
  }

  @Put('cross-table')
  @RequirePermissions([Permission.FINANCE_UPDATE])
  @ApiOperation({ summary: 'Upsert a cross-table entry (create or update)' })
  @ApiResponse({ status: 200, description: 'Cross-table entry upserted' })
  async upsertCrossTableEntry(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: UpsertCrossTableEntryDto
  ) {
    return this.feeTypesService.upsertCrossTableEntry(ctx.clubId, dto);
  }

  @Delete('cross-table/:id')
  @HttpCode(204)
  @RequirePermissions([Permission.FINANCE_DELETE])
  @ApiOperation({ summary: 'Delete a cross-table entry' })
  @ApiResponse({ status: 204, description: 'Cross-table entry deleted' })
  async removeCrossTableEntry(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string
  ): Promise<void> {
    await this.feeTypesService.deleteCrossTableEntry(ctx.clubId, id);
  }

  // ─── FeeType CRUD (parametric :id routes — AFTER static routes) ───

  @Get()
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'List all fee types for club' })
  @ApiResponse({ status: 200, description: 'List of fee types' })
  async findAll(@GetClubContext() ctx: ClubContext) {
    return this.feeTypesService.findAll(ctx.clubId);
  }

  @Get(':id')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'Get a single fee type' })
  @ApiResponse({ status: 200, description: 'Fee type details' })
  @ApiResponse({ status: 404, description: 'Fee type not found' })
  async findOne(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.feeTypesService.findOne(ctx.clubId, id);
  }

  @Post()
  @RequirePermissions([Permission.FINANCE_CREATE])
  @ApiOperation({ summary: 'Create a new fee type' })
  @ApiResponse({ status: 201, description: 'Fee type created' })
  @ApiResponse({ status: 409, description: 'Fee type name already exists' })
  async create(@GetClubContext() ctx: ClubContext, @Body() dto: CreateFeeTypeDto) {
    return this.feeTypesService.create(ctx.clubId, dto);
  }

  @Patch(':id')
  @RequirePermissions([Permission.FINANCE_UPDATE])
  @ApiOperation({ summary: 'Update a fee type' })
  @ApiResponse({ status: 200, description: 'Fee type updated' })
  @ApiResponse({ status: 404, description: 'Fee type not found' })
  async update(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: UpdateFeeTypeDto
  ) {
    return this.feeTypesService.update(ctx.clubId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions([Permission.FINANCE_DELETE])
  @ApiOperation({ summary: 'Soft-delete a fee type' })
  @ApiResponse({ status: 204, description: 'Fee type deleted' })
  @ApiResponse({ status: 404, description: 'Fee type not found' })
  async remove(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ): Promise<void> {
    await this.feeTypesService.softDelete(ctx.clubId, id, userId);
  }
}
