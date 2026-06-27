import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireClubContext, GetClubContext } from '../common/decorators/club-context.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { FeesService } from './fees.service.js';
import { CreateFeeCategoryDto } from './dto/create-fee-category.dto.js';
import { UpdateFeeCategoryDto } from './dto/update-fee-category.dto.js';
import { CreateMemberFeeOverrideDto } from './dto/create-member-fee-override.dto.js';
import type { ClubContext } from '../common/decorators/club-context.decorator.js';

@ApiTags('Fee Categories')
@ApiBearerAuth()
@Controller('clubs/:slug/fees')
@RequireClubContext()
export class FeesController {
  constructor(private feesService: FeesService) {}

  // ─── Fee Category Endpoints ─────────────────────────────────────────

  @Get('categories')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'List all fee categories for club' })
  @ApiResponse({ status: 200, description: 'List of fee categories' })
  async findAllCategories(@GetClubContext() ctx: ClubContext) {
    return this.feesService.findAll(ctx.clubId);
  }

  @Get('categories/:id')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'Get a single fee category' })
  @ApiResponse({ status: 200, description: 'Fee category details' })
  @ApiResponse({ status: 404, description: 'Fee category not found' })
  async findOneCategory(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.feesService.findOne(ctx.clubId, id);
  }

  @Post('categories')
  @RequirePermissions([Permission.FINANCE_CREATE])
  @ApiOperation({ summary: 'Create a new fee category' })
  @ApiResponse({ status: 201, description: 'Fee category created' })
  async createCategory(@GetClubContext() ctx: ClubContext, @Body() dto: CreateFeeCategoryDto) {
    return this.feesService.create(ctx.clubId, dto);
  }

  @Patch('categories/:id')
  @RequirePermissions([Permission.FINANCE_UPDATE])
  @ApiOperation({ summary: 'Update a fee category' })
  @ApiResponse({ status: 200, description: 'Fee category updated' })
  @ApiResponse({ status: 404, description: 'Fee category not found' })
  async updateCategory(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: UpdateFeeCategoryDto
  ) {
    return this.feesService.update(ctx.clubId, id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  @RequirePermissions([Permission.FINANCE_DELETE])
  @ApiOperation({ summary: 'Soft-delete a fee category' })
  @ApiResponse({ status: 204, description: 'Fee category deleted' })
  @ApiResponse({ status: 404, description: 'Fee category not found' })
  async deleteCategory(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ): Promise<void> {
    await this.feesService.softDelete(ctx.clubId, id, userId);
  }

  // ─── Member Fee Override Endpoints ──────────────────────────────────

  @Post('overrides')
  @RequirePermissions([Permission.FINANCE_CREATE])
  @ApiOperation({ summary: 'Create a member fee override' })
  @ApiResponse({ status: 201, description: 'Override created' })
  @ApiResponse({ status: 403, description: 'Member does not belong to this club' })
  async createOverride(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: CreateMemberFeeOverrideDto
  ) {
    return this.feesService.createOverride(ctx.clubId, dto);
  }

  @Get('overrides/member/:memberId')
  @RequirePermissions([Permission.FINANCE_READ])
  @ApiOperation({ summary: 'Get all fee overrides for a member' })
  @ApiResponse({ status: 200, description: 'List of member fee overrides' })
  @ApiResponse({ status: 403, description: 'Member does not belong to this club' })
  async findOverridesForMember(
    @GetClubContext() ctx: ClubContext,
    @Param('memberId') memberId: string
  ) {
    return this.feesService.findOverridesForMember(ctx.clubId, memberId);
  }

  @Delete('overrides/:id')
  @HttpCode(204)
  @RequirePermissions([Permission.FINANCE_DELETE])
  @ApiOperation({ summary: 'Delete a member fee override' })
  @ApiResponse({ status: 204, description: 'Override deleted' })
  @ApiResponse({ status: 403, description: 'Override belongs to member in different club' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  async deleteOverride(@GetClubContext() ctx: ClubContext, @Param('id') id: string): Promise<void> {
    await this.feesService.deleteOverride(ctx.clubId, id);
  }
}
