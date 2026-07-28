import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional() @IsEnum(MembershipRole)
  role?: MembershipRole;

  @IsOptional() @IsIn(['ACTIVE', 'INVITED', 'INACTIVE'])
  status?: 'ACTIVE' | 'INVITED' | 'INACTIVE';
}