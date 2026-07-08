import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum ProcessStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateProcessDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isBlocking?: boolean;

  @IsOptional()
  @IsEnum(ProcessStatusDto)
  status?: ProcessStatusDto;
}
