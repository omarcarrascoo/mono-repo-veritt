import { IsString, MaxLength } from 'class-validator';

export class DeleteSupplierInvoiceDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
