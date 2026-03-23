import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ParticipantRole } from 'generated/prisma/client';

export class CreateParticipantDto {
  @ApiPropertyOptional({ description: 'User ID to add to workspace' })
  @ValidateIf((o) => !o.email)
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ description: 'User email to add to workspace (alternative to userId)' })
  @ValidateIf((o) => !o.userId)
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: ParticipantRole, default: ParticipantRole.Member })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;
}
