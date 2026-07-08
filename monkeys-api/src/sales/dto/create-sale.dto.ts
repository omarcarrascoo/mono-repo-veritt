import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateSalePaymentDto {
  @IsString()
  paymentMethodId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  areaId?: string;

  // Opcional. Si no viene, el servidor resuelve el staffProfile vinculado
  // al usuario autenticado. Managers pueden pasarlo explícitamente para
  // registrar ventas de otros operadores.
  @IsOptional()
  @IsString()
  operatorStaffId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  @ArrayMinSize(1)
  items: CreateSaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  @ArrayMinSize(1)
  payments: CreateSalePaymentDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
