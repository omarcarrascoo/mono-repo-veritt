import { IsOptional, IsEnum } from 'class-validator';

export enum ShiftBreakTypeDto {
  MEAL = 'MEAL',
  REST = 'REST',
  OTHER = 'OTHER',
}

export class StartBreakDto {
  @IsOptional()
  @IsEnum(ShiftBreakTypeDto)
  type?: ShiftBreakTypeDto;
}
