import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ParticipantRole } from 'generated/prisma/client';

export class UpdateParticipantDto {
  @ApiPropertyOptional({ enum: ParticipantRole })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;
}
