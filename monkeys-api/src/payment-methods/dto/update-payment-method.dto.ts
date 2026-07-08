import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethodTypeDto } from './create-payment-method.dto';

export enum PaymentMethodStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PaymentMethodTypeDto)
  type?: PaymentMethodTypeDto;

  @IsOptional()
  @IsString()
  terminalReference?: string;

  @IsOptional()
  @IsString()
  bankReference?: string;

  @IsOptional()
  @IsEnum(PaymentMethodStatusDto)
  status?: PaymentMethodStatusDto;
}
