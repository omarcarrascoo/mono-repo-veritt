import { IsString, IsOptional } from 'class-validator';

export class CreateProcessExecutionDto {
  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
