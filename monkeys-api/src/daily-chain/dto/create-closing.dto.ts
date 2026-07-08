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

class ClosingItemDto {
  @IsUUID()
  materialId: string;

  @IsNumber()
  @Min(0)
  countedQuantity: number;
}

export class CreateClosingDto {
  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClosingItemDto)
  items: ClosingItemDto[];
}
