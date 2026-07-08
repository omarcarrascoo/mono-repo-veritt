import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSupplierInvoiceDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsUUID()
  receiptId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cfdiUuid?: string;

  @IsOptional()
  @IsString()
  cfdiXml?: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  invoiceDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  discrepancyNote?: string;
}
