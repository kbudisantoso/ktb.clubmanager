import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateMemberDto } from './create-member.dto.js';

export class UpdateMemberDto extends PartialType(OmitType(CreateMemberDto, ['status'] as const)) {
  @ApiProperty({
    description: 'Optimistic locking version (must match current version in database)',
    example: 0,
  })
  @IsInt({ message: 'Version muss eine ganze Zahl sein' })
  @Min(0, { message: 'Version darf nicht negativ sein' })
  version!: number;
}
