import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireClubContext, GetClubContext } from '../common/decorators/club-context.decorator.js';
import { RequirePermission } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { NumberRangesService } from './number-ranges.service.js';
import { CreateNumberRangeDto } from './dto/create-number-range.dto.js';
import { UpdateNumberRangeDto } from './dto/update-number-range.dto.js';
import type { ClubContext } from '../common/decorators/club-context.decorator.js';

@ApiTags('Number Ranges')
@ApiBearerAuth()
@Controller('clubs/:slug/number-ranges')
@RequireClubContext()
export class NumberRangesController {
  constructor(private numberRangesService: NumberRangesService) {}

  @Get()
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'List all number ranges for club' })
  @ApiResponse({ status: 200, description: 'List of number ranges' })
  async findAll(@GetClubContext() ctx: ClubContext) {
    return this.numberRangesService.findAll(ctx.clubId);
  }

  @Get(':id')
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Get a single number range' })
  @ApiResponse({ status: 200, description: 'Number range details' })
  @ApiResponse({ status: 404, description: 'Number range not found' })
  async findOne(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.numberRangesService.findOne(ctx.clubId, id);
  }

  @Post()
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Create a new number range' })
  @ApiResponse({ status: 201, description: 'Number range created' })
  @ApiResponse({ status: 409, description: 'Entity type already exists' })
  async create(@GetClubContext() ctx: ClubContext, @Body() dto: CreateNumberRangeDto) {
    return this.numberRangesService.create(ctx.clubId, dto);
  }

  @Patch(':id')
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Update a number range' })
  @ApiResponse({ status: 200, description: 'Number range updated' })
  @ApiResponse({ status: 404, description: 'Number range not found' })
  async update(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: UpdateNumberRangeDto
  ) {
    return this.numberRangesService.update(ctx.clubId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Delete a number range' })
  @ApiResponse({ status: 204, description: 'Number range deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete - numbers already generated' })
  @ApiResponse({ status: 404, description: 'Number range not found' })
  async remove(@GetClubContext() ctx: ClubContext, @Param('id') id: string): Promise<void> {
    return this.numberRangesService.delete(ctx.clubId, id);
  }

  @Get(':id/preview')
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Preview the next number without generating it' })
  @ApiResponse({ status: 200, description: 'Preview of next number' })
  @ApiResponse({ status: 404, description: 'Number range not found' })
  async previewNext(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    const range = await this.numberRangesService.findOne(ctx.clubId, id);
    const preview = this.numberRangesService.previewNext(
      range.prefix,
      range.currentValue,
      range.padLength
    );
    return { preview, currentValue: range.currentValue };
  }
}
