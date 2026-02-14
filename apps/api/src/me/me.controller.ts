import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  Header,
  Redirect,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { SessionUser } from '../auth/guards/session-auth.guard.js';
import { ClubsService } from '../clubs/clubs.service.js';
import { AccessRequestsService } from '../clubs/access-requests/access-requests.service.js';
import { MeService } from './me.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateFileDto } from '../files/dto/create-file.dto.js';

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
    private meService: MeService,
    private prisma: PrismaService
  ) {}

  // ── Clubs & Access Requests ──────────────────────────────────────

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

  // ── Profile ──────────────────────────────────────────────────────

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile (display name)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@CurrentUser() user: SessionUser, @Body() dto: UpdateProfileDto) {
    return this.meService.updateProfile(user.id, { name: dto.name });
  }

  // ── Avatar ───────────────────────────────────────────────────────

  @Post('avatar')
  @ApiOperation({
    summary: 'Initiate avatar upload (returns presigned PUT URL)',
  })
  @ApiResponse({ status: 201, description: 'File metadata created' })
  @ApiResponse({ status: 400, description: 'Invalid content type or size' })
  async createAvatar(@CurrentUser() user: SessionUser, @Body() dto: CreateFileDto) {
    return this.meService.createAvatarFile(user.id, dto);
  }

  @Post('avatar/:fileId/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm avatar upload (verifies file in S3)' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Upload confirmed' })
  @ApiResponse({
    status: 400,
    description: 'File not found in S3 or wrong status',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async confirmAvatar(@CurrentUser() user: SessionUser, @Param('fileId') fileId: string) {
    return this.meService.confirmAvatarUpload(user.id, fileId);
  }

  @Get('avatar')
  @Redirect('', 302)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: '302 redirect to avatar presigned URL' })
  @ApiResponse({ status: 302, description: 'Redirects to presigned S3 URL' })
  @ApiResponse({
    status: 404,
    description: 'No avatar set or file not found',
  })
  async getAvatar(@CurrentUser() user: SessionUser) {
    const url = await this.meService.getAvatarRedirectUrl(user.id);
    return { url };
  }

  @Delete('avatar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Remove avatar (clears user.image, soft-deletes file)',
  })
  @ApiResponse({ status: 200, description: 'Avatar removed' })
  @ApiResponse({ status: 404, description: 'No avatar set' })
  async removeAvatar(@CurrentUser() user: SessionUser) {
    return this.meService.removeAvatar(user.id);
  }

  // ── Sessions ─────────────────────────────────────────────────────

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  async getSessions(@CurrentUser() user: SessionUser) {
    return this.meService.getSessions(user.id, user.sessionId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 400, description: 'Cannot revoke current session' })
  @ApiResponse({ status: 403, description: 'Not your session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(@Param('sessionId') sessionId: string, @CurrentUser() user: SessionUser) {
    return this.meService.revokeSession(user.id, sessionId, user.sessionId);
  }

  @Delete('sessions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke all other sessions' })
  @ApiResponse({ status: 200, description: 'Other sessions revoked' })
  async revokeAllOtherSessions(@CurrentUser() user: SessionUser) {
    return this.meService.revokeAllOtherSessions(user.id, user.sessionId);
  }

  // ── Account Deletion ─────────────────────────────────────────────

  @Get('account/deletion-check')
  @ApiOperation({
    summary: 'Check if account can be deleted (sole owner check)',
  })
  @ApiResponse({
    status: 200,
    description: 'Deletion check result with blocked clubs if any',
  })
  async checkAccountDeletion(@CurrentUser() user: SessionUser) {
    return this.meService.checkAccountDeletion(user.id);
  }

  @Delete('account')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete (anonymize) account. Blocked if sole owner of any club.',
  })
  @ApiResponse({ status: 200, description: 'Account anonymized' })
  @ApiResponse({
    status: 400,
    description: 'Sole owner of one or more clubs',
  })
  async deleteAccount(@CurrentUser() user: SessionUser) {
    return this.meService.deleteAccount(user.id);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    return user?.isSuperAdmin ?? false;
  }
}
