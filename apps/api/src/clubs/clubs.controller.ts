import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  Req,
  Header,
  StreamableFile,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClubsService } from './clubs.service.js';
import { ClubExportService } from './club-export.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { DeactivateClubDto } from './dto/deactivate-club.dto.js';
import { ClubResponseDto } from './dto/club-response.dto.js';
import { SuperAdminOnly } from '../common/decorators/super-admin.decorator.js';
import { DeactivationExempt } from '../common/decorators/deactivation-exempt.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
export class ClubsController {
  constructor(
    private clubsService: ClubsService,
    private clubExportService: ClubExportService,
    private prisma: PrismaService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new club' })
  @ApiResponse({ status: 201, description: 'Club created', type: ClubResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Self-service disabled and not Super Admin',
  })
  async create(@Body() dto: CreateClubDto, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.create(dto, req.user.id, isSuperAdmin);
  }

  @Get('public')
  @ApiOperation({ summary: 'List public clubs for discovery' })
  async findPublicClubs() {
    return this.clubsService.findPublicClubs();
  }

  @Get('check-slug')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiQuery({ name: 'slug', required: true })
  async checkSlug(@Query('slug') slug: string) {
    return this.clubsService.checkSlugAvailability(slug);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get club by slug' })
  @ApiResponse({ status: 200, type: ClubResponseDto })
  @ApiResponse({ status: 404, description: 'Club not found' })
  async findOne(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.findBySlug(slug, req.user.id, isSuperAdmin);
  }

  @Put(':slug')
  @ApiOperation({ summary: 'Update club settings' })
  @ApiResponse({ status: 200, type: ClubResponseDto })
  @ApiResponse({ status: 403, description: 'Not club admin' })
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateClubDto,
    @Req() req: AuthenticatedRequest
  ) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.update(slug, dto, req.user.id, isSuperAdmin);
  }

  @Delete(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete club (soft delete)' })
  @ApiResponse({ status: 204, description: 'Club deleted' })
  @ApiResponse({ status: 403, description: 'Not club owner' })
  async remove(@Param('slug') slug: string, @Req() req: AuthenticatedRequest): Promise<void> {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.remove(slug, req.user.id, isSuperAdmin);
  }

  @Post(':slug/leave')
  @ApiOperation({ summary: 'Leave a club' })
  @ApiResponse({ status: 200, description: 'Successfully left the club' })
  @ApiResponse({ status: 403, description: 'Owners cannot leave' })
  @ApiResponse({ status: 400, description: 'Not a member' })
  async leaveClub(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    return this.clubsService.leaveClub(slug, req.user.id);
  }

  @Post(':slug/regenerate-invite-code')
  @ApiOperation({ summary: 'Regenerate club invite code' })
  @ApiResponse({ status: 200, description: 'New invite code generated' })
  @ApiResponse({ status: 403, description: 'Not club admin' })
  async regenerateInviteCode(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.regenerateInviteCode(slug, req.user.id, isSuperAdmin);
  }

  @Post(':slug/deactivate')
  @ApiOperation({ summary: 'Deactivate club (initiate grace period before deletion)' })
  @ApiResponse({ status: 200, description: 'Club deactivated', type: ClubResponseDto })
  @ApiResponse({ status: 400, description: 'Confirmation name mismatch or already deactivated' })
  @ApiResponse({ status: 403, description: 'Not club owner' })
  @ApiResponse({ status: 404, description: 'Club not found' })
  async deactivate(
    @Param('slug') slug: string,
    @Body() dto: DeactivateClubDto,
    @Req() req: AuthenticatedRequest
  ) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.deactivate(slug, dto, req.user.id, isSuperAdmin);
  }

  @Post(':slug/reactivate')
  @DeactivationExempt()
  @ApiOperation({ summary: 'Reactivate a deactivated club (cancel deletion)' })
  @ApiResponse({ status: 200, description: 'Club reactivated', type: ClubResponseDto })
  @ApiResponse({ status: 400, description: 'Club is not deactivated' })
  @ApiResponse({ status: 403, description: 'Not club owner' })
  @ApiResponse({ status: 404, description: 'Club not found' })
  async reactivate(@Param('slug') slug: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.reactivate(slug, req.user.id, isSuperAdmin);
  }

  @Get(':slug/export')
  @DeactivationExempt()
  @ApiOperation({ summary: 'Export club data as YAML (OWNER/ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Club data as YAML file' })
  @ApiResponse({ status: 403, description: 'Not club owner or admin' })
  @ApiResponse({ status: 404, description: 'Club not found' })
  async exportClub(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest
  ): Promise<StreamableFile> {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);

    // Verify OWNER or ADMIN role
    const club = await this.prisma.club.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });

    if (!club) {
      throw new ForbiddenException('Kein Zugriff');
    }

    if (!isSuperAdmin) {
      const membership = await this.prisma.clubUser.findFirst({
        where: {
          userId: req.user.id,
          clubId: club.id,
          status: 'ACTIVE',
          roles: { hasSome: ['OWNER', 'ADMIN'] },
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'Nur Inhaber und Administratoren können Vereinsdaten exportieren'
        );
      }
    }

    const yamlContent = await this.clubExportService.exportClub(club.id, slug);
    return new StreamableFile(Buffer.from(yamlContent, 'utf-8'), {
      type: 'application/x-yaml',
      disposition: `attachment; filename="${slug}.yaml"`,
    });
  }

  // Super Admin only endpoints
  @Get()
  @SuperAdminOnly()
  @ApiOperation({ summary: 'List all clubs (Super Admin only)' })
  @ApiResponse({ status: 200, type: [ClubResponseDto] })
  async findAll() {
    return this.clubsService.findAll();
  }

  private async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    return user?.isSuperAdmin ?? false;
  }
}
