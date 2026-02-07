import { Controller, Get, Post, Delete, Param, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClubsService } from '../clubs/clubs.service.js';
import { AccessRequestsService } from '../clubs/access-requests/access-requests.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private clubsService: ClubsService,
    private accessRequestsService: AccessRequestsService,
    private prisma: PrismaService
  ) {}

  @Get('clubs')
  @ApiOperation({ summary: 'List clubs the current user belongs to' })
  @ApiResponse({ status: 200, description: 'List of user clubs' })
  async getMyClubs(@Req() req: AuthenticatedRequest) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.findMyClubs(req.user.id, isSuperAdmin);
  }

  @Get('access-requests')
  @ApiOperation({ summary: 'Get my pending and recent access requests' })
  @ApiResponse({ status: 200, description: 'List of access requests' })
  async getMyAccessRequests(@Req() req: AuthenticatedRequest) {
    return this.accessRequestsService.getMyRequests(req.user.id);
  }

  @Delete('access-requests/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel a pending access request' })
  @ApiResponse({ status: 204, description: 'Request cancelled' })
  @ApiResponse({ status: 403, description: 'Not your request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async cancelAccessRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.accessRequestsService.cancelRequest(id, req.user.id);
  }

  @Post('access-requests/:id/seen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a rejected access request as seen' })
  @ApiResponse({ status: 200, description: 'Request marked as seen' })
  @ApiResponse({ status: 400, description: 'Request is not rejected' })
  @ApiResponse({ status: 403, description: 'Not your request' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async markRequestAsSeen(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.accessRequestsService.markAsSeen(id, req.user.id);
  }

  private async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    return user?.isSuperAdmin ?? false;
  }
}
