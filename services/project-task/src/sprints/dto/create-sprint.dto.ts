import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsStartBeforeEnd } from '../validators/start-before-end.validator';

export class CreateSprintDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  goal?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsStartBeforeEnd('startDate', 'endDate', {
    message: 'Start date must be before end date',
  })
  endDate: string;
}
