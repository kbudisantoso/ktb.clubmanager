import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsPositive, MaxLength, IsIn } from 'class-validator';
import { FILE_PURPOSES, type FilePurpose } from '@ktb/shared';

/** Allowed content types per file purpose */
export const ALLOWED_CONTENT_TYPES: Record<string, string[]> = {
  'club-logo': ['image/png', 'image/jpeg', 'image/webp'],
  'user-avatar': ['image/png', 'image/jpeg', 'image/webp'],
};

/** Maximum file sizes per purpose (in bytes) */
export const MAX_SIZES: Record<string, number> = {
  'club-logo': 5 * 1024 * 1024, // 5 MB
  'user-avatar': 5 * 1024 * 1024, // 5 MB
};

export class CreateFileDto {
  @ApiProperty({ example: 'logo.png', description: 'Original filename' })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ example: 'image/png', description: 'MIME content type' })
  @IsString()
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ example: 124000, description: 'File size in bytes' })
  @IsInt()
  @IsPositive()
  size!: number;

  @ApiProperty({
    example: 'club-logo',
    enum: FILE_PURPOSES,
    description: 'File purpose (determines allowed types and size limits)',
  })
  @IsString()
  @IsIn(FILE_PURPOSES)
  purpose!: FilePurpose;
}
