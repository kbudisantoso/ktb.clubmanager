import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../common/decorators/club-context.decorator.js';
import { RequireRoles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ClubUsersService, type UnlinkedUserDto } from './club-users.service.js';
import { ClubUserDto, UpdateClubUserRolesDto } from './dto/update-club-user-roles.dto.js';
import type { ClubRole } from '../../../../prisma/generated/client/index.js';

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
  @ApiOperation({ summary: 'List all users in this club' })
  @ApiResponse({ status: 200, type: [ClubUserDto] })
  async listUsers(@GetClubContext() ctx: ClubContext): Promise<ClubUserDto[]> {
    return this.clubUsersService.listClubUsers(ctx.clubId);
  }

  @Get('unlinked')
  @RequireClubContext()
  @RequireRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List club users without a linked member profile' })
  @ApiResponse({ status: 200, description: 'Unlinked users returned' })
  async getUnlinkedUsers(@GetClubContext() ctx: ClubContext): Promise<UnlinkedUserDto[]> {
    return this.clubUsersService.getUnlinkedUsers(ctx.clubId);
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
}
