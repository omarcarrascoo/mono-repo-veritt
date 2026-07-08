import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  materialId: string;

  @IsNumber()
  @Min(0.0001)
  quantityOrdered: number;

  @IsNumber()
  @Min(0)
  estimatedUnitCost: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
