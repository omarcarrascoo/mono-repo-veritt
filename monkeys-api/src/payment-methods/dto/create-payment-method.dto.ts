import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum PaymentMethodTypeDto {
  CASH = 'CASH',
  CARD_TERMINAL = 'CARD_TERMINAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export class CreatePaymentMethodDto {
  @IsString()
  name: string;

  @IsEnum(PaymentMethodTypeDto)
  type: PaymentMethodTypeDto;

  @IsOptional()
  @IsString()
  terminalReference?: string;

  @IsOptional()
  @IsString()
  bankReference?: string;
}
