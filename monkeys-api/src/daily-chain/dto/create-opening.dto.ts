import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OpeningItemDto {
  @IsUUID()
  materialId: string;

  @IsNumber()
  @Min(0)
  countedQuantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  varianceNote?: string;
}

export class CreateOpeningDto {
  @IsUUID()
  locationId: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningItemDto)
  items: OpeningItemDto[];
}
