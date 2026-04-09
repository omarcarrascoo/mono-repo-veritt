import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelReceiptDto {
  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
