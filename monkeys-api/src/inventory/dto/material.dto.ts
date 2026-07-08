import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InventoryStatusDto } from './location.dto';

export enum InventoryAdjustmentDirectionDto {
  IN = 'IN',
  OUT = 'OUT',
}

export enum MaterialKindDto {
  RAW = 'RAW',
  TRANSFORMED = 'TRANSFORMED',
}

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsString()
  baseUnit: string;

  // RAW (default): se compra a proveedor. TRANSFORMED: semi-elaborado
  // producido internamente (carne marinada, aderezos), usable en recetas.
  @IsOptional()
  @IsEnum(MaterialKindDto)
  kind?: MaterialKindDto;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  reorderFrequencyDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  baseUnit?: string;

  @IsOptional()
  @IsEnum(MaterialKindDto)
  kind?: MaterialKindDto;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  reorderFrequencyDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsEnum(InventoryStatusDto)
  status?: InventoryStatusDto;
}

export class ReceiveMaterialLotDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  lotCode?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustMaterialStockDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsEnum(InventoryAdjustmentDirectionDto)
  direction: InventoryAdjustmentDirectionDto;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class TransferMaterialStockDto {
  @IsString()
  fromLocationId: string;

  @IsString()
  toLocationId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}
