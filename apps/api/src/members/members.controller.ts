import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../common/decorators/club-context.decorator.js';
import { RequirePermission } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MembersService } from './members.service.js';
import { MemberStatusService } from './member-status.service.js';
import {
  CreateMemberDto,
  UpdateMemberDto,
  MemberResponseDto,
  PaginatedMembersResponseDto,
  MemberQueryDto,
  ChangeStatusDto,
  SetCancellationDto,
  BulkChangeStatusDto,
} from './dto/index.js';

class SoftDeleteBodyDto {
  @IsString({ message: 'Begruendung muss ein Text sein' })
  @IsNotEmpty({ message: 'Begruendung ist erforderlich' })
  @MaxLength(500, { message: 'Begruendung darf maximal 500 Zeichen lang sein' })
  reason!: string;
}

@ApiTags('Members')
@ApiBearerAuth()
@Controller('clubs/:slug/members')
@RequireClubContext()
export class MembersController {
  constructor(
    private membersService: MembersService,
    private memberStatusService: MemberStatusService
  ) {}

  @Get()
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'List members with pagination and search' })
  @ApiResponse({
    status: 200,
    description: 'Paginated member list',
    type: PaginatedMembersResponseDto,
  })
  async findAll(@GetClubContext() ctx: ClubContext, @Query() query: MemberQueryDto) {
    return this.membersService.findAll(ctx.clubId, query);
  }

  @Get(':id')
  @RequirePermission(Permission.MEMBER_READ)
  @ApiOperation({ summary: 'Get member details' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member details', type: MemberResponseDto })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findOne(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.membersService.findOne(ctx.clubId, id);
  }

  @Post()
  @RequirePermission(Permission.MEMBER_CREATE)
  @ApiOperation({ summary: 'Create a new member' })
  @ApiResponse({ status: 201, description: 'Member created', type: MemberResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Member number already exists' })
  async create(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: CreateMemberDto,
    @CurrentUser('id') userId: string
  ) {
    return this.membersService.create(ctx.clubId, dto, userId);
  }

  @Patch(':id')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update a member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member updated', type: MemberResponseDto })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 409, description: 'Member number already exists' })
  async update(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser('id') userId: string
  ) {
    return this.membersService.update(ctx.clubId, id, dto, userId);
  }

  @Delete(':id/soft')
  @RequirePermission(Permission.MEMBER_DELETE)
  @ApiOperation({ summary: 'Soft delete a member (requires status LEFT)' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member soft deleted', type: MemberResponseDto })
  @ApiResponse({ status: 400, description: 'Member status must be LEFT' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async softDelete(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() body: SoftDeleteBodyDto,
    @CurrentUser('id') userId: string
  ) {
    return this.membersService.softDelete(ctx.clubId, id, userId, body.reason);
  }

  @Post(':id/restore')
  @RequirePermission(Permission.MEMBER_DELETE)
  @ApiOperation({ summary: 'Restore a soft-deleted member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member restored', type: MemberResponseDto })
  @ApiResponse({ status: 404, description: 'Deleted member not found' })
  async restore(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.membersService.restore(ctx.clubId, id);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermission(Permission.MEMBER_DELETE)
  @ApiOperation({ summary: 'Hard delete a member (only if no financial records)' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member permanently deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete - membership periods exist' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async hardDelete(@GetClubContext() ctx: ClubContext, @Param('id') id: string) {
    return this.membersService.hardDelete(ctx.clubId, id);
  }

  @Post(':id/anonymize')
  @RequirePermission(Permission.MEMBER_DELETE)
  @ApiOperation({ summary: 'DSGVO anonymization (irreversible, requires status LEFT)' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member anonymized', type: MemberResponseDto })
  @ApiResponse({ status: 400, description: 'Member status must be LEFT or already anonymized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async anonymize(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @CurrentUser('id') userId: string
  ) {
    return this.membersService.anonymize(ctx.clubId, id, userId);
  }

  @Post(':id/change-status')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Change member status (validates transitions)' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Status changed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async changeStatus(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser('id') userId: string
  ) {
    return this.memberStatusService.changeStatus(
      ctx.clubId,
      id,
      dto.newStatus,
      dto.reason,
      userId,
      dto.effectiveDate
    );
  }

  @Post(':id/cancel')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Set cancellation date for a member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Cancellation set' })
  @ApiResponse({ status: 400, description: 'Member not active/inactive' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async setCancellation(
    @GetClubContext() ctx: ClubContext,
    @Param('id') id: string,
    @Body() dto: SetCancellationDto,
    @CurrentUser('id') userId: string
  ) {
    return this.memberStatusService.setCancellation(
      ctx.clubId,
      id,
      dto.cancellationDate,
      dto.cancellationReceivedAt,
      userId
    );
  }

  @Post('bulk/change-status')
  @RequirePermission(Permission.MEMBER_UPDATE)
  @ApiOperation({ summary: 'Bulk status change for multiple members' })
  @ApiResponse({ status: 200, description: 'Bulk status change result' })
  async bulkChangeStatus(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: BulkChangeStatusDto,
    @CurrentUser('id') userId: string
  ) {
    return this.memberStatusService.bulkChangeStatus(
      ctx.clubId,
      dto.memberIds,
      dto.newStatus,
      dto.reason,
      userId
    );
  }
}
