import { IsOptional, IsNumber, IsString } from 'class-validator';

export class ClockOutDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
