import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { FILE_PURPOSES, type FilePurpose } from './create-file.dto.js';

/**
 * Confirm upload DTO.
 * The fileId comes from the URL parameter.
 *
 * When `purpose` is provided, the confirm step performs
 * purpose-specific side effects (e.g., setting club.logoFileId).
 */
export class ConfirmUploadDto {
  @ApiPropertyOptional({
    example: 'club-logo',
    enum: FILE_PURPOSES,
    description: 'File purpose — triggers purpose-specific actions (e.g., sets club logo)',
  })
  @IsString()
  @IsOptional()
  @IsIn(FILE_PURPOSES)
  purpose?: FilePurpose;
}
