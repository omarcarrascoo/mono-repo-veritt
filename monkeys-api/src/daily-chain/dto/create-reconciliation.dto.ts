import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CashDenominationDto {
  @IsNumber()
  @Min(0)
  denomination: number;

  @IsNumber()
  @Min(0)
  quantity: number;
}

class TerminalTotalDto {
  @IsUUID()
  paymentMethodId: string;

  @IsNumber()
  @Min(0)
  reportedTotal: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

class TransferTotalDto {
  @IsNumber()
  @Min(0)
  reportedTotal: number;

  @IsOptional()
  @IsString()
  folioReferences?: string;
}

export class CreateReconciliationDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashDenominationDto)
  cashDenominations: CashDenominationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TerminalTotalDto)
  terminalTotals?: TerminalTotalDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferTotalDto)
  transferTotals?: TransferTotalDto[];
}
