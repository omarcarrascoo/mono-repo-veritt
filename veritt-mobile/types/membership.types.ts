import { MembershipRole } from '@/types/business.types';

// Refleja los DTO/enum del backend (memberships module). El estado y el rol
// deben coincidir 1:1 con Prisma (MembershipStatus / MembershipRole).

export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'INACTIVE';

// Subconjunto seguro del usuario embebido en la membresía. El backend incluye
// el registro completo (`include: { user: true }`), pero NUNCA exponemos ni
// consumimos el passwordHash en el cliente.
export interface MemberUser {
  id: string;
  email: string;
  fullName: string;
  status?: string;
}

export interface Member {
  id: string;
  businessId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  invitedByUserId?: string | null;
  joinedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  user: MemberUser;
}

export interface AddMemberDto {
  email: string;
  role: MembershipRole;
}

export interface UpdateMemberDto {
  role?: MembershipRole;
  status?: MembershipStatus;
}
