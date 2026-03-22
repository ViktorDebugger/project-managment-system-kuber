import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsStartBeforeEnd } from '../validators/start-before-end.validator';

export class UpdateSprintDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  goal?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @IsStartBeforeEnd('startDate', 'endDate', {
    message: 'Start date must be before end date',
  })
  endDate?: string;
}
