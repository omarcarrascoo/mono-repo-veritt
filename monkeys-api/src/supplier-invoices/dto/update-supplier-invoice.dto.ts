import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SupplierInvoiceStatusDto {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  DISPUTED = 'DISPUTED',
}

export class UpdateSupplierInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  cfdiUuid?: string;

  @IsOptional()
  @IsString()
  cfdiXml?: string;

  @IsOptional()
  @IsEnum(SupplierInvoiceStatusDto)
  status?: SupplierInvoiceStatusDto;
}
