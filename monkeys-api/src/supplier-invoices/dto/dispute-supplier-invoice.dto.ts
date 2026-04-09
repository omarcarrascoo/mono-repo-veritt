import { IsString, MaxLength } from 'class-validator';

export class DisputeSupplierInvoiceDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
