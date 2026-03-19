export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  status?: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}