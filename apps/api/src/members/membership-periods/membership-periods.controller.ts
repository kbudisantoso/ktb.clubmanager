import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../../common/decorators/club-context.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/permissions/permissions.enum.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { MembershipPeriodsService } from './membership-periods.service.js';
import { CreatePeriodDto, UpdatePeriodDto, ClosePeriodDto } from './dto/index.js';

@ApiTags('Membership Periods')
@ApiBearerAuth()
@Controller('clubs/:slug/members/:memberId/periods')
@RequireClubContext()
export class MembershipPeriodsController {
  constructor(private membershipPeriodsService: MembershipPeriodsService) {}

  @Get()
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List all membership periods for a member' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Membership periods list' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findByMember(@GetClubContext() ctx: ClubContext, @Param('memberId') memberId: string) {
    return this.membershipPeriodsService.findByMember(ctx.clubId, memberId);
  }

  @Post()
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Create a new membership period' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 201, description: 'Period created' })
  @ApiResponse({ status: 400, description: 'Overlap or open period exists' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async create(
    @GetClubContext() ctx: ClubContext,
    @Param('memberId') memberId: string,
    @Body() dto: CreatePeriodDto
  ) {
    return this.membershipPeriodsService.create(ctx.clubId, memberId, dto);
  }

  @Patch(':periodId')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update a membership period' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiResponse({ status: 200, description: 'Period updated' })
  @ApiResponse({ status: 400, description: 'Overlap with existing period' })
  @ApiResponse({ status: 404, description: 'Period not found' })
  async update(
    @GetClubContext() ctx: ClubContext,
    @Param('periodId') periodId: string,
    @Body() dto: UpdatePeriodDto,
    @CurrentUser('id') userId: string
  ) {
    return this.membershipPeriodsService.update(ctx.clubId, periodId, dto, userId);
  }

  @Post(':periodId/close')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Close an open membership period' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiParam({ name: 'periodId', description: 'Period ID' })
  @ApiResponse({ status: 200, description: 'Period closed' })
  @ApiResponse({ status: 400, description: 'Period already closed or invalid date' })
  @ApiResponse({ status: 404, description: 'Period not found' })
  async closePeriod(
    @GetClubContext() ctx: ClubContext,
    @Param('periodId') periodId: string,
    @Body() dto: ClosePeriodDto
  ) {
    return this.membershipPeriodsService.closePeriod(ctx.clubId, periodId, dto.leaveDate);
  }
}
