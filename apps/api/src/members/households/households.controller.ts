import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../../common/decorators/club-context.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/permissions/permissions.enum.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { HouseholdsService } from './households.service.js';
import {
  CreateHouseholdDto,
  UpdateHouseholdDto,
  AddHouseholdMemberDto,
  SyncAddressesDto,
} from './dto/index.js';

@ApiTags('Households')
@ApiBearerAuth()
@Controller('clubs/:slug/households')
@RequireClubContext()
export class HouseholdsController {
  constructor(private householdsService: HouseholdsService) {}

  @Get()
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List all households for this club' })
  @ApiResponse({ status: 200, description: 'Household list' })
  async findAll(@GetClubContext() ctx: ClubContext) {
    return this.householdsService.findAll(ctx.clubId);
  }

  @Get(':id')
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get household details' })
  @ApiParam({ name: 'id', description: 'Household ID' })
  @ApiResponse({ status: 200, description: 'Household details' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async findOne(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.householdsService.findOne(ctx.clubId, id);
  }

  @Post()
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Create a household' })
  @ApiResponse({ status: 201, description: 'Household created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: CreateHouseholdDto,
    @CurrentUser('id') userId: string
  ) {
    return this.householdsService.create(ctx.clubId, dto, userId);
  }

  @Patch(':id')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update a household' })
  @ApiParam({ name: 'id', description: 'Household ID' })
  @ApiResponse({ status: 200, description: 'Household updated' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async update(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: UpdateHouseholdDto
  ) {
    return this.householdsService.update(ctx.clubId, id, dto);
  }

  @Post(':id/members')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Add a member to a household' })
  @ApiParam({ name: 'id', description: 'Household ID' })
  @ApiResponse({ status: 200, description: 'Member added' })
  @ApiResponse({ status: 404, description: 'Household or member not found' })
  async addMember(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: AddHouseholdMemberDto
  ) {
    return this.householdsService.addMember(ctx.clubId, id, dto.memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Remove a member from a household' })
  @ApiParam({ name: 'id', description: 'Household ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove HEAD without reassignment',
  })
  @ApiResponse({ status: 404, description: 'Member not in household' })
  async removeMember(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.householdsService.removeMember(ctx.clubId, id, memberId, userId);
  }

  @Post(':id/dissolve')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Dissolve a household (remove all members, soft-delete)' })
  @ApiParam({ name: 'id', description: 'Household ID' })
  @ApiResponse({ status: 200, description: 'Household dissolved' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async dissolve(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.householdsService.dissolve(ctx.clubId, id, userId);
  }

  @Post(':id/sync-addresses')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Sync addresses from source to target members' })
  @ApiParam({ name: 'id', description: 'Household ID' })
  @ApiResponse({ status: 200, description: 'Addresses synced' })
  @ApiResponse({ status: 404, description: 'Source member not found' })
  @ApiResponse({
    status: 400,
    description: 'Target members not in household',
  })
  async syncAddresses(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: SyncAddressesDto
  ) {
    return this.householdsService.syncAddresses(
      ctx.clubId,
      id,
      dto.sourceMemberId,
      dto.targetMemberIds
    );
  }
}
