import { IsString, MaxLength } from 'class-validator';

export class RejectReceiptDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
