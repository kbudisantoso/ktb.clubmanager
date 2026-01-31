import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClubDto } from './create-club.dto.js';

// Slug cannot be changed after creation
export class UpdateClubDto extends PartialType(
  OmitType(CreateClubDto, ['slug'] as const),
) {}
