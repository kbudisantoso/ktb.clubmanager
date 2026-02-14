import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  Header,
  Redirect,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  RequireClubContext,
  GetClubContext,
  type ClubContext,
} from '../common/decorators/club-context.decorator.js';
import { RequirePermission } from '../common/decorators/permissions.decorator.js';
import { Permission } from '../common/permissions/permissions.enum.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { FilesService } from './files.service.js';
import { CreateFileDto } from './dto/create-file.dto.js';
import { ConfirmUploadDto } from './dto/confirm-upload.dto.js';
import { FileResponseDto } from './dto/file-response.dto.js';

/**
 * REST controller for file operations.
 * Scoped under /clubs/:slug/files.
 *
 * Upload flow:
 * 1. POST /files — creates metadata, returns presigned PUT URL
 * 2. Client uploads directly to S3 via presigned URL
 * 3. POST /files/:fileId/confirm — verifies upload, updates status
 */
@ApiTags('Files')
@ApiBearerAuth()
@Controller('clubs/:slug/files')
@RequireClubContext()
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post()
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Initiate file upload (returns presigned PUT URL)' })
  @ApiResponse({ status: 201, description: 'File metadata created', type: FileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid content type or size' })
  async create(
    @GetClubContext() ctx: ClubContext,
    @Body() dto: CreateFileDto,
    @CurrentUser('id') userId: string
  ) {
    return this.filesService.createFile(dto, ctx.clubId, userId);
  }

  @Post(':fileId/confirm')
  @HttpCode(200)
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Confirm file upload (verifies file in S3)' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Upload confirmed', type: FileResponseDto })
  @ApiResponse({ status: 400, description: 'File not found in S3 or wrong status' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async confirm(
    @GetClubContext() ctx: ClubContext,
    @Param('fileId') fileId: string,
    @Body() dto: ConfirmUploadDto,
    @CurrentUser('id') userId: string
  ) {
    return this.filesService.confirmUpload(fileId, ctx.clubId, dto.purpose, userId);
  }

  @Get('logo')
  @Redirect('', 302)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: '302 redirect to club logo presigned URL' })
  @ApiResponse({ status: 302, description: 'Redirects to presigned S3 URL' })
  @ApiResponse({ status: 404, description: 'No logo set or file not found' })
  async logo(@GetClubContext() ctx: ClubContext) {
    const url = await this.filesService.getLogoRedirectUrl(ctx.clubId);
    return { url };
  }

  @Delete('logo')
  @HttpCode(200)
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Remove club logo (clears logoFileId, soft-deletes file)' })
  @ApiResponse({ status: 200, description: 'Logo removed' })
  @ApiResponse({ status: 404, description: 'No logo set' })
  async removeLogo(@GetClubContext() ctx: ClubContext, @CurrentUser('id') userId: string) {
    await this.filesService.removeClubLogo(ctx.clubId, userId);
    return { message: 'Logo entfernt' };
  }

  @Get(':fileId/download')
  @Redirect('', 302)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: '302 redirect to file presigned download URL' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 302, description: 'Redirects to presigned S3 URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(@GetClubContext() ctx: ClubContext, @Param('fileId') fileId: string) {
    const url = await this.filesService.getFileDownloadUrl(fileId, ctx.clubId);
    return { url };
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file info and download URL' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File info with download URL', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async findOne(@GetClubContext() ctx: ClubContext, @Param('fileId') fileId: string) {
    return this.filesService.getFile(fileId, ctx.clubId);
  }

  @Delete(':fileId')
  @HttpCode(200)
  @RequirePermission(Permission.CLUB_SETTINGS)
  @ApiOperation({ summary: 'Soft delete a file' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  async remove(
    @GetClubContext() ctx: ClubContext,
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.filesService.deleteFile(fileId, ctx.clubId, userId);
  }
}
