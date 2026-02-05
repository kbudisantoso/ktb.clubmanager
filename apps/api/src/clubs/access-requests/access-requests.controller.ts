import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AccessRequestsService } from './access-requests.service.js';
import {
  CreateAccessRequestDto,
  JoinWithCodeDto,
} from './dto/create-access-request.dto.js';
import {
  ApproveAccessRequestDto,
  RejectAccessRequestDto,
} from './dto/process-access-request.dto.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Access Requests')
@ApiBearerAuth()
@Controller('clubs')
export class AccessRequestsController {
  constructor(private accessRequestsService: AccessRequestsService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join a private club with invite code' })
  @ApiResponse({ status: 200, description: 'Successfully joined club' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 404, description: 'Code not found' })
  async joinWithCode(
    @Body() dto: JoinWithCodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accessRequestsService.joinWithCode(req.user.id, dto.code);
  }

  @Post('request-access')
  @ApiOperation({ summary: 'Request access to a public club' })
  @ApiResponse({ status: 200, description: 'Request sent' })
  @ApiResponse({
    status: 400,
    description: 'Club is private or already requested',
  })
  async requestAccess(
    @Body() dto: CreateAccessRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accessRequestsService.requestAccess(
      req.user.id,
      dto.clubIdOrSlug,
      dto.message,
    );
  }

  // Club admin endpoints
  @Get(':slug/access-requests')
  @ApiOperation({ summary: 'Get pending access requests for a club (admin)' })
  async getClubRequests(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accessRequestsService.getClubRequests(slug, req.user.id);
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve an access request' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveAccessRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accessRequestsService.approve(id, dto.roles, req.user.id);
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject an access request' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectAccessRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.accessRequestsService.reject(
      id,
      dto.reason,
      dto.note,
      req.user.id,
    );
  }
}
