import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ClubsService } from './clubs.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { UpdateClubDto } from './dto/update-club.dto.js';
import { ClubResponseDto, MyClubResponseDto } from './dto/club-response.dto.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { SuperAdminOnly } from '../common/decorators/super-admin.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
@UseGuards(SessionAuthGuard)
export class ClubsController {
  constructor(
    private clubsService: ClubsService,
    private prisma: PrismaService,
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

  @Get('my')
  @ApiOperation({ summary: 'List clubs the current user belongs to' })
  @ApiResponse({ status: 200, type: [MyClubResponseDto] })
  async findMyClubs(@Req() req: AuthenticatedRequest) {
    return this.clubsService.findMyClubs(req.user.id);
  }

  @Get('public')
  @ApiOperation({ summary: 'List public clubs for discovery' })
  async findPublicClubs() {
    return this.clubsService.findPublicClubs();
  }

  @Get('check-slug')
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
    @Req() req: AuthenticatedRequest,
  ) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.update(slug, dto, req.user.id, isSuperAdmin);
  }

  @Delete(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete club (soft delete)' })
  @ApiResponse({ status: 204, description: 'Club deleted' })
  @ApiResponse({ status: 403, description: 'Not club owner' })
  async remove(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.remove(slug, req.user.id, isSuperAdmin);
  }

  @Post(':slug/regenerate-invite-code')
  @ApiOperation({ summary: 'Regenerate club invite code' })
  @ApiResponse({ status: 200, description: 'New invite code generated' })
  @ApiResponse({ status: 403, description: 'Not club admin' })
  async regenerateInviteCode(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const isSuperAdmin = await this.isSuperAdmin(req.user.id);
    return this.clubsService.regenerateInviteCode(slug, req.user.id, isSuperAdmin);
  }

  // Super Admin only endpoints
  @Get()
  @UseGuards(SuperAdminGuard)
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
