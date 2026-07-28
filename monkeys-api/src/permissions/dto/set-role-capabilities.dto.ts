import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetRoleCapabilitiesDto {
  // Lista de capacidades que tendrá el rol en este negocio (override completo).
  // Se validan contra CAPABILITIES en el service.
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  capabilities: string[];
}
