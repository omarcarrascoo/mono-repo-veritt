import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum UpdatePayrollPaymentStatusDto {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SKIPPED = 'SKIPPED',
}

export class UpdatePayrollPaymentDto {
  @IsEnum(UpdatePayrollPaymentStatusDto)
  status: UpdatePayrollPaymentStatusDto;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
