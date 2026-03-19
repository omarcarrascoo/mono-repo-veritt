import { IsInt, IsOptional, IsString, Max, Min, IsObject } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsObject() operationalScheduleJson?: Record<string, any>;
  @IsOptional() @IsInt() @Min(0) @Max(23) operationalDayCutoffHour?: number;
}