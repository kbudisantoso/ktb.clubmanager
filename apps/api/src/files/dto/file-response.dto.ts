import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for file operations.
 * Used for Swagger documentation — actual responses are plain objects.
 */
export class FileResponseDto {
  @ApiProperty({ example: 'clxyz123abc' })
  id!: string;

  @ApiProperty({ example: 'logo.png' })
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  contentType!: string;

  @ApiProperty({ example: 124000 })
  size!: number;

  @ApiProperty({ example: 'UPLOADED', enum: ['PENDING_UPLOAD', 'UPLOADED', 'DELETED', 'MISSING'] })
  status!: string;

  @ApiPropertyOptional({
    example: 'http://minio:9000/clubmanager/clubs/abc/xyz?X-Amz-Signature=...',
    description: 'Presigned PUT URL (only returned on create)',
  })
  uploadUrl?: string;

  @ApiPropertyOptional({
    example: 'http://minio:9000/clubmanager/clubs/abc/xyz?X-Amz-Signature=...',
    description: 'Presigned GET URL (returned on confirm and get)',
  })
  url?: string;

  @ApiPropertyOptional({ example: '2026-01-15T10:30:00.000Z' })
  uploadedAt?: string | null;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt!: string;
}
