import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAccessRequestDto {
  @ApiProperty({ description: 'Club ID or slug to request access to' })
  @IsString()
  clubIdOrSlug!: string;

  @ApiPropertyOptional({
    description: 'Optional message to the club admin',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}

export class JoinWithCodeDto {
  @ApiProperty({
    description: 'Invite code (with or without dash)',
    example: 'HXNK-4P9M',
  })
  @IsString()
  code!: string;
}
