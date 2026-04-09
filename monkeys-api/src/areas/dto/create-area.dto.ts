import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum AreaTypeDto {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR',
  DINING = 'DINING',
  CASH_REGISTER = 'CASH_REGISTER',
  WAREHOUSE = 'WAREHOUSE',
  OFFICE = 'OFFICE',
  PRODUCTION = 'PRODUCTION',
  OTHER = 'OTHER',
}

export class CreateAreaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(AreaTypeDto)
  type?: AreaTypeDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentAreaId?: string;
}
