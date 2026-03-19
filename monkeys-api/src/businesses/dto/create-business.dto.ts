import { IsInt, IsOptional, IsString, Max, Min, IsObject } from 'class-validator';

export class CreateBusinessDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() description?: string;
  @IsString() timezone: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsObject() operationalScheduleJson?: Record<string, any>;
  @IsInt() @Min(0) @Max(23) operationalDayCutoffHour: number;
}