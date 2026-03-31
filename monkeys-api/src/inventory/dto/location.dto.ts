import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum InventoryLocationTypeDto {
  MAIN = 'MAIN',
  WAREHOUSE = 'WAREHOUSE',
  RESTAURANT = 'RESTAURANT',
  KITCHEN = 'KITCHEN',
  OTHER = 'OTHER',
}

export enum InventoryStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class CreateInventoryLocationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(InventoryLocationTypeDto)
  type?: InventoryLocationTypeDto;
}

export class UpdateInventoryLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(InventoryLocationTypeDto)
  type?: InventoryLocationTypeDto;

  @IsOptional()
  @IsEnum(InventoryStatusDto)
  status?: InventoryStatusDto;
}
