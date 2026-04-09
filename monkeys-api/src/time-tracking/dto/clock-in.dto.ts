import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ClockInDto {
  @IsString()
  staffProfileId: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
