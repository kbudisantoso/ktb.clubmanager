import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireClubContext, GetClubContext } from '../common/decorators/club-context.decorator.js';
import { RequirePermission } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { MembershipTypesService } from './membership-types.service.js';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto.js';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto.js';
import type { ClubContext } from '../common/decorators/club-context.decorator.js';

@ApiTags('Membership Types')
@ApiBearerAuth()
@Controller('clubs/:slug/membership-types')
@RequireClubContext()
export class MembershipTypesController {
  constructor(private membershipTypesService: MembershipTypesService) {}

  @Get()
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List all membership types for club' })
  @ApiResponse({ status: 200, description: 'List of membership types' })
  async findAll(@GetClubContext() ctx: ClubContext) {
    return this.membershipTypesService.findAll(ctx.clubId);
  }

  @Get(':id')
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get a single membership type' })
  @ApiResponse({ status: 200, description: 'Membership type details' })
  @ApiResponse({ status: 404, description: 'Membership type not found' })
  async findOne(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.membershipTypesService.findOne(ctx.clubId, id);
  }

  @Post()
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Create a new membership type' })
  @ApiResponse({ status: 201, description: 'Membership type created' })
  @ApiResponse({ status: 409, description: 'Code already exists for this club' })
  async create(@GetClubContext() ctx: ClubContext, @Body() dto: CreateMembershipTypeDto) {
    return this.membershipTypesService.create(ctx.clubId, dto);
  }

  @Patch(':id')
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Update a membership type' })
  @ApiResponse({ status: 200, description: 'Membership type updated' })
  @ApiResponse({ status: 404, description: 'Membership type not found' })
  async update(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipTypeDto
  ) {
    return this.membershipTypesService.update(ctx.clubId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Delete a membership type' })
  @ApiResponse({ status: 204, description: 'Membership type deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete - type is in use by membership periods' })
  @ApiResponse({ status: 404, description: 'Membership type not found' })
  async remove(@GetClubContext() ctx: ClubContext, @Param('id') id: string): Promise<void> {
    return this.membershipTypesService.remove(ctx.clubId, id);
  }
}
