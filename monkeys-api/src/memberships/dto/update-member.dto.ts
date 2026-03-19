import { IsIn, IsOptional } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional() @IsIn(['OWNER', 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'VERITT_STAFF'])
  role?: 'OWNER' | 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'VERITT_STAFF';

  @IsOptional() @IsIn(['ACTIVE', 'INVITED', 'INACTIVE'])
  status?: 'ACTIVE' | 'INVITED' | 'INACTIVE';
}