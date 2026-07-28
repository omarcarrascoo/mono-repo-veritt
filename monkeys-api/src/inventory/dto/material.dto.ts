import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

// ── FTI (Formato de Transformación Interna) ──

export class MaterialRecipeItemDto {
  @IsString()
  materialId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wastePercent?: number;
}

// Define la receta de producción de un insumo TRANSFORMED: qué insumos crudos
// consume y cuánto rinde (outputQuantity).
export class CreateMaterialRecipeDto {
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  outputQuantity?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => MaterialRecipeItemDto)
  @ArrayMinSize(1)
  items: MaterialRecipeItemDto[];
}

// Ejecuta la transformación: produce `quantity` del insumo transformado,
// consumiendo los crudos de su receta activa (FIFO) en la ubicación dada.
export class ProduceTransformedMaterialDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  materialRecipeId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsDateString()
  producedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
