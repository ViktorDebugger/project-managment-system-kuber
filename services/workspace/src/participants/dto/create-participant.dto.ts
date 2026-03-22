import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { ParticipantRole } from 'generated/prisma/client';

export class CreateParticipantDto {
  @ApiProperty({ description: 'User ID to add to workspace' })
  @IsUUID('4')
  userId: string;

  @ApiProperty({ enum: ParticipantRole, default: ParticipantRole.Member })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;
}
