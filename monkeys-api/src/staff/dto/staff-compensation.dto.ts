import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum PayrollFrequencyDto {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  SEMIMONTHLY = 'SEMIMONTHLY',
  MONTHLY = 'MONTHLY',
}

export class StaffCompensationDto {
  @IsNumber()
  @Min(0.01)
  salaryAmount: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @IsEnum(PayrollFrequencyDto)
  payrollFrequency: PayrollFrequencyDto;

  @IsOptional()
  @IsDateString()
  firstPaymentDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  weeklyPayDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  monthlyPayDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  semimonthlyFirstDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  semimonthlySecondDay?: number;
}
