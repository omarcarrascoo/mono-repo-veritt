import {
  Business,
  BusinessOnboarding,
  CreateBusinessDto,
  UpdateBusinessOnboardingDto,
} from '@/types/business.types';
import { apiClient } from '@/api/client';

export const businessesApi = {
  async getMine(): Promise<Business[]> {
    const { data } = await apiClient.get<Business[]>('/businesses');
    return data;
  },

  async create(payload: CreateBusinessDto): Promise<Business> {
    const { data } = await apiClient.post<Business>('/businesses', payload);
    return data;
  },

  async getOnboarding(businessId: string): Promise<BusinessOnboarding> {
    const { data } = await apiClient.get<BusinessOnboarding>(
      `/businesses/${businessId}/onboarding`
    );
    return data;
  },

  async updateOnboarding(
    businessId: string,
    payload: UpdateBusinessOnboardingDto
  ): Promise<BusinessOnboarding> {
    const { data } = await apiClient.patch<BusinessOnboarding>(
      `/businesses/${businessId}/onboarding`,
      payload
    );
    return data;
  },
};