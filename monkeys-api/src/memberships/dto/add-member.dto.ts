import { IsEmail, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsEmail() email: string;
  @IsIn(['OWNER', 'ADMIN', 'SUPERVISOR', 'OPERATOR', 'VERITT_STAFF'])
  role: 'OWNER' | 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'VERITT_STAFF';
}