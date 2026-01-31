import { PartialType } from '@nestjs/swagger';
import { CreateTierDto } from './create-tier.dto.js';

/**
 * DTO for updating a tier.
 * All fields are optional (partial update).
 */
export class UpdateTierDto extends PartialType(CreateTierDto) {}
