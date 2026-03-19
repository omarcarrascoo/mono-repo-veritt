import { apiClient } from '@/api/client';
import { AuthUser, LoginDto, LoginResponse, RegisterDto } from '@/types/auth.types';

export const authApi = {
  async login(payload: LoginDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/register', payload);
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me');
    return data;
  },
};