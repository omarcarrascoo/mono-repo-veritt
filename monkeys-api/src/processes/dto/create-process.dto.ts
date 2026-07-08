import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsInt, Min, IsEnum, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsEnum(['OWNER', 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'VERITT_STAFF'])
  requiredRole?: string;

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
