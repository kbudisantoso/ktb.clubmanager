import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMemberDto } from './create-member.dto.js';

export class UpdateMemberDto extends PartialType(OmitType(CreateMemberDto, ['status'] as const)) {}
