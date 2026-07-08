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

export class CreateReceiptItemDto {
  @IsUUID()
  materialId: string;

  @IsNumber()
  @Min(0.0001)
  quantityReceived: number;

  @IsNumber()
  @Min(0)
  actualUnitCost: number;
}

export class CreateReceiptDto {
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptItemDto)
  items: CreateReceiptItemDto[];
}
