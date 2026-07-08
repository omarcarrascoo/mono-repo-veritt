import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifySupplierInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
