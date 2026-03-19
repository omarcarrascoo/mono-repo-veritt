import {
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StaffCompensationDto } from './staff-compensation.dto';
import { SystemAccessLevelDto } from './create-staff.dto';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  operationalRole?: string;

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

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}