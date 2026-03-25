import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Redirect,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
  ApiQuery,
} from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../common/decorators/club-context.decorator.js';
import { RequireRoles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  ClubUsersService,
  type UnlinkedUserDto,
  type ClubUserDetailDto,
} from './club-users.service.js';
import { ClubUserDto, UpdateClubUserRolesDto } from './dto/update-club-user-roles.dto.js';
import { InviteClubUserDto } from './dto/invite-club-user.dto.js';
import { UpdateClubUserStatusDto } from './dto/update-club-user-status.dto.js';
import type { ClubRole, ClubUserStatus } from '../../../../prisma/generated/client/index.js';

class ToggleExternalDto {
  @ApiProperty({ description: 'Whether the user is external (no member profile needed)' })
  @IsBoolean()
  isExternal!: boolean;
}

@ApiTags('Club Users')
@ApiBearerAuth()
@Controller('clubs/:slug/users')
export class ClubUsersController {
  constructor(private clubUsersService: ClubUsersService) {}

  @Get()
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List all users in this club (with optional filters)' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by name or email' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (comma-separated: ACTIVE,SUSPENDED,PENDING)',
  })
  @ApiQuery({
    name: 'roles',
    required: false,
    description: 'Filter by roles (comma-separated: OWNER,ADMIN,TREASURER,SECRETARY,MEMBER)',
  })
  @ApiResponse({ status: 200, type: [ClubUserDto] })
  async listUsers(
    @GetClubContext() ctx: ClubContext,
    @Query('search') search?: string,
    @Query('status') statusParam?: string,
    @Query('roles') rolesParam?: string
  ): Promise<ClubUserDto[]> {
    const status = statusParam
      ? (statusParam.split(',').filter(Boolean) as ClubUserStatus[])
      : undefined;
    const roles = rolesParam ? (rolesParam.split(',').filter(Boolean) as ClubRole[]) : undefined;

    return this.clubUsersService.listClubUsers(ctx.clubId, { search, status, roles });
  }

  @Get('unlinked')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List club users without a linked member profile' })
  @ApiResponse({ status: 200, description: 'Unlinked users returned' })
  async getUnlinkedUsers(@GetClubContext() ctx: ClubContext): Promise<UnlinkedUserDto[]> {
    return this.clubUsersService.getUnlinkedUsers(ctx.clubId);
  }

  @Post('invite')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Invite a user to the club by email' })
  @ApiResponse({ status: 201, type: ClubUserDto, description: 'User invited successfully' })
  @ApiResponse({ status: 400, description: 'User not found or already a member' })
  async inviteUser(
    @GetClubContext() ctx: ClubContext,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: InviteClubUserDto
  ): Promise<ClubUserDto> {
    return this.clubUsersService.inviteUser(ctx.clubId, dto.email, dto.roles, actorUserId);
  }

  @Get(':clubUserId')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get single user detail with member-link info' })
  @ApiResponse({ status: 200, description: 'User detail returned' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetail(
    @GetClubContext() ctx: ClubContext,
    @Param('clubUserId') clubUserId: string
  ): Promise<ClubUserDetailDto> {
    return this.clubUsersService.getClubUserDetail(ctx.clubId, clubUserId);
  }

  @Patch(':clubUserId/status')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Change user status (suspend/reactivate)' })
  @ApiResponse({ status: 200, type: ClubUserDto, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Cannot change own status or last owner' })
  async updateStatus(
    @GetClubContext() ctx: ClubContext,
    @Param('clubUserId') clubUserId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: UpdateClubUserStatusDto
  ): Promise<ClubUserDto> {
    return this.clubUsersService.updateClubUserStatus(
      ctx.clubId,
      clubUserId,
      actorUserId,
      dto.status
    );
  }

  @Patch(':clubUserId/roles')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update user roles' })
  @ApiResponse({ status: 200, type: ClubUserDto })
  async updateRoles(
    @GetClubContext() ctx: ClubContext,
    @Param('clubUserId') clubUserId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() dto: UpdateClubUserRolesDto
  ): Promise<ClubUserDto> {
    return this.clubUsersService.updateClubUserRoles(
      ctx.clubId,
      clubUserId,
      actorUserId,
      ctx.roles as ClubRole[],
      dto
    );
  }

  @Patch(':clubUserId/external')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Toggle external flag on a club user' })
  @ApiResponse({ status: 200, description: 'External flag toggled' })
  async toggleExternal(
    @GetClubContext() ctx: ClubContext,
    @Param('clubUserId') clubUserId: string,
    @Body() dto: ToggleExternalDto
  ): Promise<UnlinkedUserDto> {
    return this.clubUsersService.toggleExternal(ctx.clubId, clubUserId, dto.isExternal);
  }

  @Delete(':clubUserId')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove user from club' })
  @ApiResponse({ status: 204, description: 'User removed' })
  async removeUser(
    @GetClubContext() ctx: ClubContext,
    @Param('clubUserId') clubUserId: string,
    @CurrentUser('id') actorUserId: string
  ): Promise<void> {
    await this.clubUsersService.removeClubUser(ctx.clubId, clubUserId, actorUserId);
  }

  @Get(':userId/avatar')
  @RequireClubContext()
  @Redirect('', 302)
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Get user avatar (tenant-scoped, 302 redirect to S3)' })
  @ApiResponse({ status: 302, description: 'Redirects to presigned S3 URL' })
  @ApiResponse({ status: 404, description: 'No avatar or user not in club' })
  async getUserAvatar(@GetClubContext() ctx: ClubContext, @Param('userId') userId: string) {
    const url = await this.clubUsersService.getUserAvatarUrl(ctx.clubId, userId);
    return { url };
  }
}
