import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../common/decorators/club-context.decorator.js';
import { MyPermissionsService } from './my-permissions.service.js';
import { MyPermissionsResponseDto } from './dto/my-permissions.dto.js';
import type { ClubRole } from '../../../../prisma/generated/client/index.js';

@ApiTags('Clubs')
@Controller('clubs/:slug')
export class MyPermissionsController {
  constructor(private myPermissionsService: MyPermissionsService) {}

  @Get('my-permissions')
  @RequireClubContext()
  @ApiOperation({ summary: 'Get my permissions in this club' })
  @ApiResponse({
    status: 200,
    description: 'User permissions, tier features, and roles',
    type: MyPermissionsResponseDto,
  })
  async getMyPermissions(@GetClubContext() ctx: ClubContext) {
    return this.myPermissionsService.getMyPermissions(
      ctx.clubId,
      ctx.roles as ClubRole[],
    );
  }
}
