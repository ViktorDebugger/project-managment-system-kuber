import { IsArray, IsString } from 'class-validator';

export class ResolveTagsDto {
  @IsArray()
  @IsString({ each: true })
  names: string[];
}
