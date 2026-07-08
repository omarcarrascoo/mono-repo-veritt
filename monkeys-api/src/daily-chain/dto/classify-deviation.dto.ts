import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

enum DeviationCauseDto {
  ERROR = 'ERROR',
  WASTE = 'WASTE',
  THEFT = 'THEFT',
  ADJUSTMENT = 'ADJUSTMENT',
  OVERPRODUCTION = 'OVERPRODUCTION',
  UNDERPRODUCTION = 'UNDERPRODUCTION',
  OTHER = 'OTHER',
}

class ClassifyItemDto {
  @IsUUID()
  materialId: string;

  @IsEnum(DeviationCauseDto)
  cause: DeviationCauseDto;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ClassifyDeviationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassifyItemDto)
  items: ClassifyItemDto[];
}
