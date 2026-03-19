import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StaffCompensationDto } from './staff-compensation.dto';

export enum SystemAccessLevelDto {
  NONE = 'NONE',
  OPERATOR = 'OPERATOR',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export class CreateStaffDto {
  @IsString()
  fullName: string;

  @IsString()
  operationalRole: string;

  @IsOptional()
  @IsObject()
  assignedAreasJson?: Record<string, any>;

  @IsOptional()
  @IsString()
  shift?: string;

  @IsOptional()
  @IsEnum(SystemAccessLevelDto)
  systemAccessLevel?: SystemAccessLevelDto;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffCompensationDto)
  compensation?: StaffCompensationDto;
}