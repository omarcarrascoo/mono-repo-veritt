import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsInt, Min, IsEnum, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipRole } from '@prisma/client';

export class ProcessStepDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsOptional()
  @IsEnum(MembershipRole)
  requiredRole?: MembershipRole;

  @IsOptional()
  @IsString()
  assignedAreaId?: string;
}

export class CreateProcessDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isBlocking?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessStepDto)
  @ArrayMinSize(1)
  steps: ProcessStepDto[];
}
