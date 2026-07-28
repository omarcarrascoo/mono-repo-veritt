import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Saldo inicial de caja (candado C2): R2 declara el efectivo con el que abre
// la caja antes de la 1ª venta. El FAF parte de este saldo.
export class CreateCashOpeningDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsNumber()
  @Min(0)
  openingBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
