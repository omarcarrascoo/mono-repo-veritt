import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AreaTypeDto } from './create-area.dto';

export enum AreaStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateAreaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AreaTypeDto)
  type?: AreaTypeDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentAreaId?: string;

  @IsOptional()
  @IsEnum(AreaStatusDto)
  status?: AreaStatusDto;
}
