import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
