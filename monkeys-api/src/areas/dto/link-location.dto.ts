import { IsString } from 'class-validator';

export class LinkLocationDto {
  @IsString()
  locationId: string;
}
