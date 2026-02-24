import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class DeactivateClubDto {
  @ApiProperty({
    description: 'Grace period in days before permanent deletion (7-90)',
    minimum: 7,
    maximum: 90,
    example: 30,
  })
  @IsInt()
  @Min(7)
  @Max(90)
  gracePeriodDays!: number;

  @ApiProperty({
    description: 'Club name for confirmation (must match exactly)',
    example: 'TSV Musterstadt 1920',
  })
  @IsString()
  @MinLength(1)
  confirmationName!: string;
}
