import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryAdjustmentDirectionDto } from './material.dto';
import { InventoryStatusDto } from './location.dto';

export enum ProductTypeDto {
  DIRECT = 'DIRECT',
  RECIPE = 'RECIPE',
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsEnum(ProductTypeDto)
  type: ProductTypeDto;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  stockUnit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDailySalesVolume?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  stockUnit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDailySalesVolume?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsEnum(InventoryStatusDto)
  status?: InventoryStatusDto;
}

export class ProductCostBreakdownDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  materialCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  directLaborCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedCifCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number;
}

export class AddProductPriceDto {
  @IsNumber()
  @Min(0.0001)
  price: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class AddProductManualCostDto extends ProductCostBreakdownDto {
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class ProductRecipeVersionItemDto {
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

export class CreateProductRecipeVersionDto {
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  directLaborCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedCifCost?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => ProductRecipeVersionItemDto)
  @ArrayMinSize(1)
  items: ProductRecipeVersionItemDto[];
}

export class ReceiveProductLotDto extends ProductCostBreakdownDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsDateString()
  producedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateProductionBatchDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  recipeVersionId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsDateString()
  producedAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  directLaborCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedCifCost?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustProductStockDto extends ProductCostBreakdownDto {
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsEnum(InventoryAdjustmentDirectionDto)
  direction: InventoryAdjustmentDirectionDto;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class TransferProductStockDto {
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
